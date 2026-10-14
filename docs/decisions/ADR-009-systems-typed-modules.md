# ADR-009 — Systems = typed core modules + JSON-schema custom entities + declarative views

Date: decided in the build spec v2.0 (11 Oct 2026); recorded 2026-10-15 · Status: accepted · Source: `docs/spec/17_DECISIONS_AND_OPEN_QUESTIONS.md` §1

## Decision

Systems = typed core modules + JSON-schema custom entities + declarative views.

## Why

Integrity for bookings/invoices; flexibility for everything else.

## Alternatives rejected

Pure JSON record store (no constraints); generated code per System (hard to upgrade).
