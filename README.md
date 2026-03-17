# feed-reader

![Coverage](https://raw.githubusercontent.com/nakatanakatana/octocov-central/main/badges/nakatanakatana/feed-reader/coverage.svg)
![Code to Test Ratio](https://raw.githubusercontent.com/nakatanakatana/octocov-central/main/badges/nakatanakatana/feed-reader/ratio.svg)
![Test Execution Time](https://raw.githubusercontent.com/nakatanakatana/octocov-central/main/badges/nakatanakatana/feed-reader/time.svg)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/nakatanakatana/feed-reader)

A self-hosted, full-stack RSS/Atom feed reader application.

## usage

### docker

```sh
docker run ghcr.io/nakatanakatana/feed-reader:latest
```

or

```sh
mkdir data
chmod 777 data
docker run -v $PWD/data:/data -e "DB_PATH=/data/feed-reader.db" ghcr.io/nakatanakatana/feed-reader:latest
```
