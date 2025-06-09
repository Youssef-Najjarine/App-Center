# Tools/Scripts/scripts.py

import os
import shutil
import subprocess
from typing import List, Optional


class ScriptError(Exception):
    """Custom exception class for script-related errors."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class FileManagement:
    """Utility class for file and directory management operations."""

    @staticmethod
    def create_directory(path: str):
        """Creates a directory if it doesn't exist."""
        try:
            os.makedirs(path, exist_ok=True)
            print(f"Directory created: {path}")
        except Exception as e:
            raise ScriptError(f"Failed to create directory '{path}': {str(e)}")

    @staticmethod
    def delete_directory(path: str):
        """Deletes a directory and its contents."""
        try:
            if os.path.exists(path):
                shutil.rmtree(path)
                print(f"Directory deleted: {path}")
            else:
                print(f"Directory not found: {path}")
        except Exception as e:
            raise ScriptError(f"Failed to delete directory '{path}': {str(e)}")

    @staticmethod
    def copy_file(source: str, destination: str):
        """Copies a file from source to destination."""
        try:
            shutil.copy(source, destination)
            print(f"Copied file from {source} to {destination}")
        except Exception as e:
            raise ScriptError(f"Failed to copy file from '{source}' to '{destination}': {str(e)}")


class SystemCommands:
    """Utility class for executing system commands."""

    @staticmethod
    def run_command(command: str, cwd: Optional[str] = None) -> str:
        """Runs a system command and returns the output."""
        try:
            result = subprocess.run(command, cwd=cwd, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            print(f"Command executed: {command}")
            return result.stdout
        except subprocess.CalledProcessError as e:
            raise ScriptError(f"Command '{command}' failed with error: {e.stderr}")

    @staticmethod
    def list_directory(path: str) -> List[str]:
        """Lists the contents of a directory."""
        try:
            contents = os.listdir(path)
            print(f"Contents of {path}: {contents}")
            return contents
        except Exception as e:
            raise ScriptError(f"Failed to list directory '{path}': {str(e)}")


class DeploymentScripts:
    """Utility class for deployment-related tasks."""

    @staticmethod
    def prepare_deployment():
        """Prepares the application for deployment by cleaning and building necessary files."""
        try:
            print("Preparing deployment...")
            FileManagement.delete_directory('dist')
            FileManagement.create_directory('dist')
            SystemCommands.run_command('python setup.py sdist bdist_wheel')
            print("Deployment preparation complete.")
        except ScriptError as e:
            print(f"Error during deployment preparation: {str(e)}")

    @staticmethod
    def deploy_application():
        """Deploys the application by uploading to a remote server or service."""
        try:
            print("Deploying application...")
            # Here you would typically upload your distribution files to a server or service
            # For example, using SCP to copy files to a remote server:
            # SystemCommands.run_command('scp dist/* user@server:/path/to/deployment/')
            print("Application deployed successfully.")
        except ScriptError as e:
            print(f"Error during deployment: {str(e)}")


class MaintenanceScripts:
    """Utility class for maintenance tasks."""

    @staticmethod
    def backup_database(database_path: str, backup_path: str):
        """Backs up the database to the specified location."""
        try:
            print(f"Backing up database from {database_path} to {backup_path}...")
            FileManagement.copy_file(database_path, backup_path)
            print("Database backup complete.")
        except ScriptError as e:
            print(f"Error during database backup: {str(e)}")

    @staticmethod
    def restore_database(backup_path: str, database_path: str):
        """Restores the database from a backup."""
        try:
            print(f"Restoring database from {backup_path} to {database_path}...")
            FileManagement.copy_file(backup_path, database_path)
            print("Database restoration complete.")
        except ScriptError as e:
            print(f"Error during database restoration: {str(e)}")


# Example usage:
if __name__ == "__main__":
    # Example usage of file management scripts
    FileManagement.create_directory('example_dir')
    FileManagement.copy_file('example_file.txt', 'example_dir/example_file.txt')
    FileManagement.delete_directory('example_dir')

    # Example usage of system commands
    SystemCommands.list_directory('.')
    SystemCommands.run_command('echo "Hello, World!"')

    # Example usage of deployment scripts
    DeploymentScripts.prepare_deployment()
    DeploymentScripts.deploy_application()

    # Example usage of maintenance scripts
    MaintenanceScripts.backup_database('example.db', 'backups/example_backup.db')
    MaintenanceScripts.restore_database('backups/example_backup.db', 'example_restored.db')
