make: build
	
build: run
	
run:
	open ./index.html

deploy-test:
	rsync -vrc * tyg@theyardgames.org:/httpdocs/game/wind/test --exclude-from rsync-exclude
