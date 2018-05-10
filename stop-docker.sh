#!/bin/bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose-postgresql.yml -f docker-compose-kafka.yml down