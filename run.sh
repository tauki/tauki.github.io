#!/bin/bash

# Install dependencies if Gemfile.lock doesn't exist
if [ ! -f "Gemfile.lock" ]; then
    bundle install
fi

# Build and serve the site
bundle exec jekyll serve --livereload 