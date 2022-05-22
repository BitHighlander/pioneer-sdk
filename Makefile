SHELL=/bin/bash

env=prod
debug=false
coin=false

.DEFAULT_GOAL := build

clean::
	find . -name "node_modules" -type d -prune -print | xargs du -chs && find . -name 'node_modules' -type d -prune -print -exec rm -rf '{}' \; &&\
	sh scripts/clean.sh

build::
	yarn && yarn build && onchange 'src/**/*.ts' -- yarn build

test::
	sh scripts/e2e-test.sh $(env) $(debug) $(coin)

bump::
	lerna version patch --yes

publish::
	lerna publish from-package --no-private --yes

## TODO start application
up::
	echo "todo"
