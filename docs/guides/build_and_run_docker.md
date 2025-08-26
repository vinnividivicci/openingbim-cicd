# Building and Running the Application with Docker

This guide provides instructions on how to build and run the application using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) must be installed on your system.

## Building the Docker Image

To build the Docker image, open a terminal in the root of the project and run the following command:

```bash
docker build -t bim-app .
```

## Running the Docker Container

Once the image is built, you can run the application in a Docker container with the following command:

```bash
docker run -d -p 8080:80 --name bim-app-container bim-app
```

This will start the container in detached mode and map port 8080 on your local machine to port 80 in the container.

## Accessing the Application

To access the application, open your web browser and navigate to:

[http://localhost:8080](http://localhost:8080)

## Stopping and Removing the Container

To stop the container, run the following command:

```bash
docker stop bim-app-container
```

To remove the container, run the following command:

```bash
docker rm bim-app-container
```
