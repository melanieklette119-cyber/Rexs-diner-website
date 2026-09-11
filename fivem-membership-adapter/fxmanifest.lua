shared_script '@WaveShield/resource/include.lua'

fx_version 'cerulean'
game 'gta5'

author 'Rex Diner'
description 'FiveM membership billing adapter (test hook)'

server_scripts {
	'config.lua',
	'server.lua'
}
client_script 'client.lua'
shared_script '@ox_lib/init.lua'

dependencies {
	'ox_lib',
	'ox_inventory',
	'jobs_creator',
	'es_extended',
	'oxmysql'
}