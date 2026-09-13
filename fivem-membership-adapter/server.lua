Config = Config or {}
Config.intervalMs = Config.intervalMs or 60 * 60 * 1000

local ESX = exports['es_extended']:getSharedObject()

local pendingNotifications = {}
local loggedMessages = {}

local function getPlayerName(source)
  return GetPlayerName(source) or 'FiveM Spieler'
end

local function logOnce(key, message)
  if loggedMessages[key] then return end
  loggedMessages[key] = true
  print(message)
end

local function getDiscordId(source)
  local identifier = GetPlayerIdentifierByType(source, 'discord')
  if not identifier then return nil end
  return identifier:gsub('^discord:', '')
end

RegisterNetEvent('rex_order:requestLogin', function()
  local source = source
  local discordId = getDiscordId(source)
  if not discordId then
    local returnTo = '/bestellen?fivem=1'
    local loginUrl = Config.adapterUrl .. '/api/auth/discord?returnTo=' .. returnTo
    TriggerClientEvent('rex_order:loginResult', source, {
      error = 'Keine Discord-ID in FiveM gefunden. Discord-Anmeldung wird außerhalb von FiveM geöffnet.',
      loginUrl = loginUrl,
    })
    return
  end

  PerformHttpRequest(Config.adapterUrl .. '/api/auth/fivem/token', function(status, body)
    local payload = json.decode(body or '{}') or {}
    if status ~= 200 or not payload.token then
      print(('[order] FiveM-Login konnte nicht erstellt werden (HTTP %s)'):format(status))
      TriggerClientEvent('rex_order:loginResult', source, { error = 'Die Bestellseite konnte nicht geöffnet werden.' })
      return
    end

    TriggerClientEvent('rex_order:loginResult', source, {
      url = Config.adapterUrl .. '/api/auth/fivem?token=' .. payload.token,
    })
  end, 'POST', json.encode({
    discordId = discordId,
    username = getPlayerName(source),
    secret = Config.fivemAuthSecret,
  }), { ['Content-Type'] = 'application/json' })
end)

local function isInventoryReady()
  return GetResourceState('ox_inventory') == 'started'
end

local function findPlayerByDiscord(discordId)
  for _, playerId in ipairs(GetPlayers()) do
    local source = tonumber(playerId)
    if source and getDiscordId(source) == tostring(discordId) then return source end
  end
  return nil
end

local function notifyPlayer(discordId, amount)
  if not discordId or not isInventoryReady() then return false end

  for _, playerId in ipairs(GetPlayers()) do
    local source = tonumber(playerId)
    if source and getDiscordId(source) == tostring(discordId) then
      TriggerClientEvent('rex_membership:notify', source, amount)
      return true
    end
  end

  return false
end

local function queueNotification(discordId, amount)
  if not discordId then return end
  if not notifyPlayer(discordId, amount) then
    pendingNotifications[tostring(discordId)] = amount
  end
end

RegisterNetEvent('rex_membership:clientReady', function()
  local source = source
  local discordId = getDiscordId(source)
  local amount = discordId and pendingNotifications[discordId]
  if amount and isInventoryReady() then
    pendingNotifications[discordId] = nil
    TriggerClientEvent('rex_membership:notify', source, amount)
  end
end)

local function chargeBankAccount(discordId, bankAccountId, amount)
  local source = findPlayerByDiscord(discordId)
  if source then
    local xPlayer = ESX.GetPlayerFromId(source)
    local account = xPlayer and xPlayer.getAccount('bank')
    if account then
      local newBalance = (tonumber(account.money) or 0) - amount
      xPlayer.setAccountMoney('bank', newBalance, 'Rex\'s Diner Mitgliedschaft')
      print(('[membership] Online-ESX-Konto %s belastet: %.2f -> %.2f'):format(tostring(bankAccountId), account.money, newBalance))
      return true
    end
  end

  local rows = MySQL.query.await(([[
    SELECT identifier, accounts
    FROM `%s`
    WHERE identifier IN (?, ?, ?)
    LIMIT 1
  ]]):format(Config.usersTable), {
    tostring(discordId),
    'discord:' .. tostring(discordId),
    tostring(bankAccountId),
  })
  local row = rows and rows[1]
  if not row then
    logOnce('offline:' .. tostring(discordId), ('[membership] Kein ESX-Benutzer für Discord-ID %s gefunden'):format(tostring(discordId)))
    return false
  end

  local accounts = json.decode(row.accounts or '{}') or {}
  local bank = accounts.bank
  if type(bank) == 'table' then bank = bank.money end
  local newBalance = (tonumber(bank) or 0) - amount
  if type(accounts.bank) == 'table' then
    accounts.bank.money = newBalance
  else
    accounts.bank = newBalance
  end

  local changed = MySQL.update.await(([[
    UPDATE `%s` SET accounts = ? WHERE identifier = ?
  ]]):format(Config.usersTable), { json.encode(accounts), row.identifier })
  if not changed or changed < 1 then
    print(('[membership] Offline-ESX-Konto %s konnte nicht gespeichert werden'):format(tostring(bankAccountId)))
    return false
  end

  print(('[membership] Offline-ESX-Konto %s belastet: %.2f -> %.2f'):format(tostring(bankAccountId), tonumber(bank) or 0, newBalance))
  return true
end

local function addSocietyMoney(amount)
  if GetResourceState('jobs_creator') ~= 'started' then
    print('[membership] jobs_creator is not started; society payment skipped')
    return false
  end

  local ok, result = pcall(function()
    return exports['jobs_creator']:addSocietyMoney(Config.societyJob, amount)
  end)

  if not ok or result == false then
    print(('[membership] Society-Gutschrift für %s fehlgeschlagen'):format(Config.societyJob))
    return false
  end

  print(('[membership] %.2f auf Fraktionskonto %s gutgeschrieben'):format(amount, Config.societyJob))
  return true
end

local function processCharges()
  logOnce('startup', '[membership] Abo-Abbuchung gestartet; offene Abbuchungen werden geprüft')
  if Config.adapterUrl == '' or Config.cronSecret == '' then
    logOnce('config', '[membership] FEHLER: adapterUrl oder cronSecret fehlt in config.lua')
    return
  end
  PerformHttpRequest(Config.adapterUrl .. '/api/memberships/charges', function(status, body)
    if status ~= 200 then logOnce('api:' .. tostring(status), ('[membership] API-Abfrage fehlgeschlagen: HTTP %s, Antwort: %s'):format(status, body or '')); return end
    local payload = json.decode(body or '{}') or {}
    logOnce('api_ready', '[membership] API erreichbar; offene Abbuchungen wurden geladen')
    for _, charge in ipairs(payload.charges or {}) do
      local plan = charge.membership_plans or {}
      local amount = tonumber(charge.chargeAmount or plan.price or 0) or 0
      local success = chargeBankAccount(charge.discord_id, charge.fivem_bank_account_id, amount)
      if success then success = addSocietyMoney(amount) end
      local result = json.encode({ contractId = charge.id, idempotencyKey = charge.idempotencyKey, chargeIntervals = charge.chargeIntervals, chargeAmount = amount, status = success and 'succeeded' or 'failed', errorMessage = success and nil or 'ESX-Bankkonto konnte nicht belastet werden' })
      PerformHttpRequest(Config.adapterUrl .. '/api/memberships/charges', function(resultStatus)
        print(('[membership] Abbuchung %s für Vertrag %s an API gemeldet (HTTP %s)'):format(success and 'erfolgreich' or 'fehlgeschlagen', charge.id, resultStatus))
        if resultStatus >= 200 and resultStatus < 300 and success then
          queueNotification(charge.discord_id, amount)
        end
      end, 'POST', result, { ['Content-Type'] = 'application/json', ['x-membership-cron-secret'] = Config.cronSecret })
    end
  end, 'GET', '', { ['x-membership-cron-secret'] = Config.cronSecret })
end

local function checkMembership(source)
  local discordId = getDiscordId(source)
  if not discordId then
    TriggerClientEvent('rex_membership:checkResult', source, { error = 'Keine Discord-ID gefunden.' })
    return
  end

  PerformHttpRequest(Config.adapterUrl .. '/api/memberships/charges?discordId=' .. discordId, function(status, body)
    if status ~= 200 then
      TriggerClientEvent('rex_membership:checkResult', source, { error = 'Abo konnte nicht geladen werden.' })
      return
    end

    local payload = json.decode(body or '{}') or {}
    TriggerClientEvent('rex_membership:checkResult', source, { contracts = payload.contracts or {} })
  end, 'GET', '', { ['x-membership-cron-secret'] = Config.cronSecret })
end

local function hasActiveMembership(source, callback)
  local discordId = getDiscordId(source)
  if not discordId or Config.adapterUrl == '' or Config.cronSecret == '' then
    callback(false)
    return
  end

  PerformHttpRequest(Config.adapterUrl .. '/api/memberships/charges?discordId=' .. discordId, function(status, body)
    if status ~= 200 then
      callback(false)
      return
    end

    local payload = json.decode(body or '{}') or {}
    callback(type(payload.contracts) == 'table' and #payload.contracts > 0)
  end, 'GET', '', { ['x-membership-cron-secret'] = Config.cronSecret })
end

RegisterNetEvent('rex_membership:checkAccess', function()
  local source = source
  hasActiveMembership(source, function(active)
    TriggerClientEvent('rex_membership:accessResult', source, active)
  end)
end)

exports('HasActiveMembership', function(source, callback)
  hasActiveMembership(source, callback)
end)

RegisterCommand('checkabo', function(source)
  if source == 0 then
    print('[membership] /checkabo kann nur im Spiel verwendet werden')
    return
  end
  checkMembership(source)
end, false)

CreateThread(function()
  while true do
    processCharges()
    Wait(Config.intervalMs)
  end
end)
