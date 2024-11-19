terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9.0"
    }
  }
}

provider "local" {}

resource "null_resource" "fix_minikube_permissions" {
  provisioner "local-exec" {
    command = "sudo chown -R $USER $HOME/.minikube; chmod -R u+wrx $HOME/.minikube"
  }
}

resource "null_resource" "install_minikube" {
  depends_on = [null_resource.fix_minikube_permissions]

  provisioner "local-exec" {
    command = <<EOT
      if ! command -v minikube &> /dev/null; then
        arch=$(uname -m)
        case $arch in
          arm64)
            echo "Downloading and installing Minikube for arm64 architecture..."
            curl -LO https://github.com/kubernetes/minikube/releases/download/v1.34.0/minikube-darwin-arm64
            sudo install minikube-darwin-arm64 /usr/local/bin/minikube
            rm minikube-darwin-arm64
            ;;
          x86_64)
            echo "Downloading and installing Minikube for amd64 architecture..."
            curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64
            sudo install minikube-darwin-amd64 /usr/local/bin/minikube
            rm minikube-darwin-amd64
            ;;
          *)
            echo "Unsupported architecture: $arch"
            exit 1
        esac
      else
        echo "Minikube is already installed"
      fi

      minikube version
    EOT
  }
}

resource "null_resource" "start_minikube" {
  depends_on = [null_resource.install_minikube]

  provisioner "local-exec" {
    command = <<EOT
      if ! minikube status | grep -q "Running"; then
        echo "Starting minikube..."
        minikube start --driver=docker
        
        # Wait for minikube to be ready
        echo "Waiting for minikube to be ready..."
        until minikube status | grep -q "Running"; do
          sleep 5
        done
      else
        echo "Minikube is already running"
      fi
    EOT
  }
}

resource "null_resource" "setup_kubeconfig" {
  depends_on = [null_resource.start_minikube]

  provisioner "local-exec" {
    command = <<EOT
      echo "Setting up kubeconfig..."
      minikube update-context
      mkdir -p $HOME/.kube
      minikube kubectl -- config view --raw > $HOME/.kube/config
      chmod 600 $HOME/.kube/config
      
      # Wait for kubectl to be able to connect
      echo "Waiting for kubectl to connect..."
      until kubectl get nodes &>/dev/null; do
        sleep 5
        echo "Retrying..."
      done
    EOT
  }
}

resource "time_sleep" "wait_for_kubernetes" {
  depends_on = [null_resource.setup_kubeconfig]
  create_duration = "30s"
}

resource "null_resource" "deploy_resources" {
  depends_on = [time_sleep.wait_for_kubernetes]

  provisioner "local-exec" {
    command = <<EOT
      # Create namespace
      echo "Creating namespace..."
      kubectl create namespace example --dry-run=client -o yaml | kubectl apply -f -
      
      # Wait for namespace to be ready
      kubectl wait --for=condition=Active namespace/example --timeout=60s
      
      echo "Deploying Helm charts..."
      # Deploy helm charts
      helm upgrade --install express-app ../helm-charts/express-app \
        --namespace example --create-namespace --wait
      
      helm upgrade --install localstack ../helm-charts/localstack \
        --namespace example --create-namespace --wait
      
      helm upgrade --install postgres ../helm-charts/postgres \
        --namespace example --create-namespace --wait
      
      echo "Deployment completed successfully"
      
      # Show deployment status
      echo "Deployment Status:"
      kubectl get pods -n example
    EOT
  }
}

# Add a verification step
resource "null_resource" "verify_deployment" {
  depends_on = [null_resource.deploy_resources]

  provisioner "local-exec" {
    command = <<EOT
      echo "Verifying deployments..."
      kubectl get pods -n example -o wide
      kubectl get services -n example
      minikube ip
    EOT
  }
}