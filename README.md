# Release flow

- `stable` branch, manual bump
  - deploy to prod
- `beta` automatic bump, without tags pushed (skip ci)
  - deploy to dev
- `dev` no bump
  - deploy to dev
