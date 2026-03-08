#!/bin/bash

echo "Saving project progress..."

git add .
git commit -m "auto save progress"
git push origin main
git status
