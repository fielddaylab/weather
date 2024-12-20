make: build
	
build: run
	
run:
	open ./index.html

deploy-test:
	rsync -vrc * tyg@theyardgames.org:/httpdocs/game/bacteria/test --exclude-from rsync-exclude