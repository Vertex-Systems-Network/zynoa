# ADR-015 — SeaweedFS replaces MinIO for local/CI S3

Date: 2026-10-15 · Status: accepted · Decider: AI build session, per ENGINEERING-RULES rule 8 (verify provider facts at implementation time) and rule 10 (spec updated in the same PR)

## Context

The spec named MinIO as the local S3 emulator. At implementation time MinIO could not be verified as a
live project: its company abandoned the open-source project in late 2025, the Docker Hub repository no
longer serves tags, and the community edition had features removed before that. Production object storage
is unchanged (Cloudflare R2); this decision only covers local development and CI, which need any
S3-compatible endpoint.

## Decision

Use **SeaweedFS** (`chrislusf/seaweedfs`, Apache 2.0) in `infra/docker/docker-compose.yml`:
single container (`weed server -s3`), S3 API support since 2018, 5M+ pulls, actively maintained.
Credentials come from a mounted `s3.json`; buckets are created by a one-shot init service.

## Alternatives considered

- Keep MinIO's last image: unmaintained, registry availability already broken — rejected.
- S3Proxy: simple, but its core dependency (Apache jclouds) was retired to the Apache Attic in 2025.
- RustFS: alpha, recent security vulnerability.
- Garage / Ozone / Ceph: multi-container or heavyweight setup for a local emulator.
- LocalStack: much larger image for the one service we need.

## Consequences

- `.env.example` works unchanged (endpoint `http://localhost:9000`, path-style access).
- Spec files 02/15/16 updated to name SeaweedFS.
- If SeaweedFS ever misbehaves against R2-targeted code, revisit with S3Proxy as the fallback.

## Sources

- https://rmoff.net/2026/01/14/alternatives-to-minio-for-single-node-local-s3/
- https://pinggy.io/blog/minio_archived_self_hosted_s3_alternatives/
