terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "local" {}

provider "kubernetes" {
  config_path = "~/.kube/config"
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}

resource "null_resource" "create_helm_charts" {
  provisioner "local-exec" {
    command = <<EOT
      #!/bin/bash
      cd /Users/eran/Documents/fullpath/restaurant-search-api

      # Set the base directory for Helm charts
      BASE_DIR="helm-charts"

      # Create the base directory for Helm charts
      mkdir -p $BASE_DIR

      # Function to create a Helm chart
      create_helm_chart() {
        local chart_name=$1

        mkdir -p $BASE_DIR/$chart_name/templates

        # Create Chart.yaml
        cat <<EOF > $BASE_DIR/$chart_name/Chart.yaml
apiVersion: v2
name: $chart_name
description: A Helm chart for Kubernetes
version: 0.1.0
appVersion: "1.0"
EOF

        # Create values.yaml
        cat <<EOF > $BASE_DIR/$chart_name/values.yaml
replicaCount: 1

image:
  repository: my-docker-username/$chart_name
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 3000

env:
  DB_USER: postgres
  DB_HOST: postgres
  DB_NAME: restaurants
  DB_PASSWORD: postgres
  DB_PORT: 5432
  JWT_SECRET: your-secret-key-here
  ADMIN_PASSWORD: your-admin-password
  LOCALSTACK_HOST: localstack
  LOCALSTACK_PORT: 4566
EOF

        # Create deployment.yaml
        cat <<EOF > $BASE_DIR/$chart_name/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $chart_name
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: $chart_name
  template:
    metadata:
      labels:
        app: $chart_name
    spec:
      containers:
        - name: $chart_name
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          env:
            - name: DB_USER
              value: {{ .Values.env.DB_USER }}
            - name: DB_HOST
              value: {{ .Values.env.DB_HOST }}
            - name: DB_NAME
              value: {{ .Values.env.DB_NAME }}
            - name: DB_PASSWORD
              value: {{ .Values.env.DB_PASSWORD }}
            - name: DB_PORT
              value: {{ .Values.env.DB_PORT }}
            - name: JWT_SECRET
              value: {{ .Values.env.JWT_SECRET }}
            - name: ADMIN_PASSWORD
              value: {{ .Values.env.ADMIN_PASSWORD }}
            - name: LOCALSTACK_HOST
              value: {{ .Values.env.LOCALSTACK_HOST }}
            - name: LOCALSTACK_PORT
              value: {{ .Values.env.LOCALSTACK_PORT }}
          ports:
            - containerPort: 3000
EOF

        # Create service.yaml
        cat <<EOF > $BASE_DIR/$chart_name/templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: $chart_name
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: 3000
  selector:
    app: $chart_name
EOF
      }

      # Create Helm charts for express-app, localstack, and postgres
      create_helm_chart "express-app"
      create_helm_chart "localstack"
      create_helm_chart "postgres"

      # Customize the postgres values.yaml
      cat <<EOF > $BASE_DIR/postgres/values.yaml
replicaCount: 1

image:
  repository: postgres
  tag: "14"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 5432

env:
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: postgres
  POSTGRES_DB: restaurants
EOF

      # Customize the postgres deployment.yaml
      cat <<EOF > $BASE_DIR/postgres/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          env:
            - name: POSTGRES_USER
              value: {{ .Values.env.POSTGRES_USER }}
            - name: POSTGRES_PASSWORD
              value: {{ .Values.env.POSTGRES_PASSWORD }}
            - name: POSTGRES_DB
              value: {{ .Values.env.POSTGRES_DB }}
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: postgres-pvc
EOF

      # Customize the postgres service.yaml
      cat <<EOF > $BASE_DIR/postgres/templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: 5432
  selector:
    app: postgres
EOF

      echo "Helm charts created successfully in $BASE_DIR."
    EOT
  }
}

resource "null_resource" "fix_minikube_permissions" {
  provisioner "local-exec" {
    command = "sudo chown -R $USER $HOME/.minikube; chmod -R u+wrx $HOME/.minikube"
  }
}

resource "null_resource" "install_minikube" {
  depends_on = [null_resource.create_helm_charts, null_resource.fix_minikube_permissions]

  provisioner "local-exec" {
    command = <<EOT
      arch=$(uname -m)
      case $arch in
        arm64)
          echo "Downloading and installing Minikube for arm64 architecture..."
          curl -LO https://github.com/kubernetes/minikube/releases/download/v1.34.0/minikube-darwin-arm64
          sudo install minikube-darwin-arm64 /usr/local/bin/minikube
          ;;
        x86_64)
          echo "Downloading and installing Minikube for amd64 architecture..."
          curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64
          sudo install minikube-darwin-amd64 /usr/local/bin/minikube
          ;;
        *)
          echo "Unsupported architecture: $arch"
          exit 1
          ;;
      esac
      if [ -f /usr/local/bin/minikube ]; then
        echo "Minikube installed successfully."
        minikube version
      else
        echo "Minikube installation failed."
        exit 1
      fi
    EOT
  }
}

resource "null_resource" "start_minikube" {
  depends_on = [null_resource.install_minikube]

  provisioner "local-exec" {
    command = <<EOT
      minikube start --driver=docker
      sleep 30  # Add a delay to ensure the Kubernetes API server is ready
    EOT
  }
}

resource "null_resource" "setup_kubeconfig" {
  depends_on = [null_resource.start_minikube]

  provisioner "local-exec" {
    command = <<EOT
      minikube update-context
      mkdir -p $HOME/.kube
      minikube kubectl -- config view --raw > $HOME/.kube/config
      export KUBECONFIG=$HOME/.kube/config
    EOT
  }
}

resource "helm_release" "express_app" {
  depends_on = [null_resource.setup_kubeconfig]

  name       = "express-app"
  chart      = "../helm-charts/express-app"
  namespace  = "example"
  values     = [
    file("../helm-charts/express-app/values.yaml")
  ]
}

resource "helm_release" "localstack" {
  depends_on = [null_resource.setup_kubeconfig]

  name       = "localstack"
  chart      = "../helm-charts/localstack"
  namespace  = "example"
  values     = [
    file("../helm-charts/localstack/values.yaml")
  ]
}

resource "helm_release" "postgres" {
  depends_on = [null_resource.setup_kubeconfig]

  name       = "postgres"
  chart      = "../helm-charts/postgres"
  namespace  = "example"
  values     = [
    file("../helm-charts/postgres/values.yaml")
  ]
}