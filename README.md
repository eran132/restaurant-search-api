To run the project after pulling the code, ensure you have the following prerequisites:

Node.js: Install Node.js from nodejs.org. </br>
Docker: Install Docker from docker.com.
Then follow these steps:

Clone the repository:

git clone https://github.com/eran132/restaurant-search-api.git

cd restaurant-search-api

npm run setup command runs the ./scripts/setup-dev.sh


Login: http://localhost:3000/ <br>
Admin password in .env file
Add the following line (replace your_username with your actual username):
your_username ALL=(ALL) NOPASSWD: /bin/chown -R your_username /Users/your_username/.minikube, /bin/chmod -R u+wrx /Users/your_username/.minikube

2. Clone the Repository
Clone the repository to your local machine:
git clone https://github.com/your-repo/restaurant-search-api.git
cd restaurant-search-api

3. Initialize Terraform
Initialize Terraform in the terraform directory:

cd terraform
terraform init

4. Apply Terraform Configuration
Apply the Terraform configuration to set up the Kubernetes cluster and deploy the application:

4. Apply Terraform Configuration
Apply the Terraform configuration to set up the Kubernetes cluster and deploy the application:

4. Apply Terraform Configuration
Apply the Terraform configuration to set up the Kubernetes cluster and deploy the application:

terraform apply


5. Verify Deployment
Verify that the application is deployed and running:

kubectl get pods -n example
kubectl get services -n example

Project Structure
terraform/: Contains the Terraform configuration files.
helm-charts/: Contains the Helm charts for deploying the application.
README.md: This file.
Troubleshooting
If you encounter any issues, ensure that:

Docker is running.
Minikube is running and the Kubernetes API server is accessible.
The KUBECONFIG environment variable is set correctly.
You can manually set the permissions for the .minikube directory if needed:
sudo chown -R $USER $HOME/.minikube
sudo chmod -R u+wrx $HOME/.minikube

Cleanup
To clean up the resources created by Terraform, run:
terraform destroy


### Summary

- **Configure `sudo` to Run Without Password**: Edit the `sudoers` file to allow specific commands to run without a password.
- **Clone the Repository**: Clone the repository to your local machine.
- **Initialize Terraform**: Initialize Terraform in the [terraform](http://_vscodecontentref_/2) directory.
- **Apply Terraform Configuration**: Apply the Terraform configuration to set up the Kubernetes cluster and deploy the application.
- **Verify Deployment**: Verify that the application is deployed and running.
- **Troubleshooting**: Ensure that Docker and Minikube are running and the `KUBECONFIG` environment variable is set correctly.
- **Cleanup**: Clean up the resources created by Terraform.

By following these steps, you can automate the entire process using Terraform and ensure that the Kubernetes cluster and application are set up correctly.