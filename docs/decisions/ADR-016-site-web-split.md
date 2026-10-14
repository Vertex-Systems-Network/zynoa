# ADR-016 — Marketing site and dashboard are separate apps (`apps/site`, `apps/web`)

Date: 2026-10-12 (plan) · Status: accepted · Decider: project owner via `docs/plan/BUILD-PLAN.md` §8

## Decision

The spec's single `apps/web` (marketing + authenticated app) is split: `apps/site` is the marketing
website, `apps/web` is the dashboard (authenticated app + end-customer pages).

## Why

Different release cadence (site ships on every merge, dashboard goes through staging); GSAP's licence
confines it to the marketing site; a site bug must never block a dashboard release; smaller deploys.

## Alternatives rejected

One Next.js app with route groups (couples releases and dependency trees; GSAP would enter the
dashboard bundle's dependency set).
