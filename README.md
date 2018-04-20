# message

## Prerequisites

### 1. Software

* Docker (version 17.03+) - Run software packaged into isolated containers.
[Docker](https://www.docker.com/) must be installed before you can use docker sample.

# Quick start

1. Install 
```
git clone git@github.com:montagestudio/montage-data-stack.git
cd montage-data-stack
npm install
```

2. Start
```
npm start:node
```

3. Run Unit-Tests
```
npm test
npm integration
```

4. Open live Documentation
```
npm run doc
```

You can also open you browser to "https://localhost:8080" to see a basic Service Montage Application with basic CRUD operations.

## Troubleshooting & Useful Tools

### Start and deploy

```
# npm run build
docker build . -t message:develop-SNAPSHOT

# npm run start:swarm
docker swarm init

# npm run start:stack
docker stack deploy -c docker-compose.yml 'montage-auth'

# npm run start:doc
open https://localhost:8080/doc/swagger.html
```

### Shutdown stack

```
# npm run stop:swarm
docker swarm leave --force
```
### REST API documentation

See swagger Documentation: [swagger.yml](./doc/swagger.yml).

### Npm commands
 
 - `lint`: jshint . 
 - `start`: node index.js 
 - `test`: mocha test --timeout 10000 --exit 
 - `integration`: concurrently \npm run serve:test\ \npm run open:test\ 
 - `doc`: concurrently \npm run serve:doc\ \npm run open:doc\ 
 - `serve:test`: http-server -p 8081 
 - `serve:doc`: http-server -p 8082 doc 
 - `open:app`: open http://localhost:8080 
 - `open:test`: open http://localhost:8081/test 
 - `open:doc`: open http://localhost:8082 
 - `start:swarm`: docker swarm init 
 - `start:stack`: docker stack deploy -c docker-compose.yml 'message-stack' 
 - `stop:stack`: docker stack rm 'message-stack' 
 - `stop:swarm`: docker swarm leave --force 
 - `build`: npm run build:docker 
 - `build:docker`: docker build . -t message:develop-SNAPSHOT 
 - `build:compose`: docker-compose build 
 - `start:compose`: docker-compose up -d 
 - `stop:compose`: docker-compose down
 - 
## License


