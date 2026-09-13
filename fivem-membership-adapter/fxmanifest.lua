fx_version 'cerulean'
game 'gta5'

author 'Rex Diner'
description 'FiveM membership billing adapter (test hook)'

ui_page 'web/index.html'

files {
  'web/index.html',
  'web/style.css',
  'web/script.js'
}

server_scripts {
	'config.lua',
	'server.lua'
}

client_script { 
	'client-config.lua',
  'client.lua',
}

shared_script {
	'@ox_lib/init.lua',
	'@WaveShield/resource/include.lua'
}

dependencies {
	'ox_lib',
	'ox_target',
	'ox_inventory',
	'jobs_creator',
	'es_extended',
	'oxmysql'
}