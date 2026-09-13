local tabletProp = nil
local tabletAnimation = 'amb@world_human_seat_wall_tablet@female@base'
local tabletAnimationName = 'base'
local tabletPickupAnimation = 'amb@world_human_tourist_map@male@base'
local tabletPickupAnimationName = 'base'
local tabletOpening = false

local function loadAsset(asset, isModel)
  if isModel then
    RequestModel(asset)
    while not HasModelLoaded(asset) do Wait(0) end
  else
    RequestAnimDict(asset)
    while not HasAnimDictLoaded(asset) do Wait(0) end
  end
end

local function stopTabletEmote()
  local ped = PlayerPedId()
  StopAnimTask(ped, tabletAnimation, tabletAnimationName, 1.0)
  StopAnimTask(ped, tabletPickupAnimation, tabletPickupAnimationName, 1.0)
  ClearPedSecondaryTask(ped)
  tabletOpening = false

  if tabletProp and DoesEntityExist(tabletProp) then
    DeleteEntity(tabletProp)
    tabletProp = nil
  end
end

local function startTabletEmote()
  local ped = PlayerPedId()
  stopTabletEmote()

  loadAsset(tabletPickupAnimation, false)
  loadAsset(tabletAnimation, false)
  loadAsset(`prop_cs_tablet`, true)

  tabletProp = CreateObject(`prop_cs_tablet`, 1.0, 1.0, 1.0, true, true, false)
  AttachEntityToEntity(tabletProp, ped, GetPedBoneIndex(ped, 28422), 0.0, -0.03, 0.0, 20.0, 0.0, 0.0, true, true, false, true, 1, true)
  SetModelAsNoLongerNeeded(`prop_cs_tablet`)
  tabletOpening = true
  TaskPlayAnim(ped, tabletPickupAnimation, tabletPickupAnimationName, 8.0, -8.0, 5000, 49, 0.0, false, false, false)
  SetNuiFocus(true, true)
  SendNUIMessage({ action = 'open' })

  CreateThread(function()
    Wait(5000)
    if not tabletOpening or not tabletProp or not DoesEntityExist(tabletProp) then return end
    TaskPlayAnim(ped, tabletAnimation, tabletAnimationName, 8.0, -8.0, -1, 49, 0.0, false, false, false)
  end)
end

local function closeNui()
  stopTabletEmote()
  SetNuiFocus(false, false)
  SendNUIMessage({ action = 'close' })
end

CreateThread(function()
  closeNui()
end)

AddEventHandler('onResourceStop', function(resourceName)
  if resourceName == GetCurrentResourceName() then
    stopTabletEmote()
  end
end)

CreateThread(function()
  while GetResourceState('ox_inventory') ~= 'started' do
    Wait(1000)
  end

  TriggerServerEvent('rex_membership:clientReady')
end)

RegisterNetEvent('rex_membership:notify', function(amount)
  if GetResourceState('ox_inventory') ~= 'started' then return end

  lib.notify({
    title = "Rex's Diner",
    description = ('Dein Rex\'s Diner Abo wurde abgebucht in Höhe von %.2f'):format(tonumber(amount) or 0),
    type = 'success',
  })
end)

RegisterNetEvent('rex_membership:checkResult', function(result)
  if result.error then
    lib.notify({ title = "Rex's Diner", description = result.error, type = 'error' })
    return
  end

  if not result.contracts or #result.contracts == 0 then
    lib.notify({ title = "Rex's Diner", description = 'Du hast kein aktives Abo.', type = 'inform' })
    return
  end

  for _, contract in ipairs(result.contracts) do
    local plan = contract.membership_plans or {}
    if plan[1] then plan = plan[1] end
    local status = contract.status == 'pending_cancellation' and 'Warte bis Ablauf' or 'Aktiv'
    local year, month, day, hour, minute = tostring(contract.next_charge_at or ''):match('^(%d%d%d%d)-(%d%d)-(%d%d)T(%d%d):(%d%d)')
    local nextCharge = year and ('%s.%s.%s um %s:%s Uhr'):format(day, month, year, hour, minute) or 'Nicht festgelegt'
    local amount = ('%.2f'):format(tonumber(plan.price) or 0):gsub('%.', ',')
    lib.notify({
      title = plan.name or 'Mitgliedschaft',
      description = ('**Status:** %s\n**Nächste Abbuchung:** %s\n**Betrag:** %s €'):format(status, nextCharge, amount),
      type = 'inform',
      duration = 10000,
    })
  end
end)

RegisterNetEvent('rex_membership:accessResult', function(hasAccess)
  if not hasAccess then
    lib.notify({ title = "Rex's Diner", description = 'Du hast kein aktives Abo für diesen Bereich.', type = 'error' })
  end
end)

CreateThread(function()
  while GetResourceState('ox_target') ~= 'started' do
    Wait(1000)
  end

  local rawTargets = Config.orderTarget
  if not rawTargets then
    print('[order] Config.orderTarget muss gesetzt sein')
    return
  end

  local targets = {}
  if rawTargets.coords then
    targets = { rawTargets }
  else
    targets = rawTargets
  end

  if type(targets) ~= 'table' or #targets == 0 then
    print('[order] Config.orderTarget muss entweder ein einzelner Punkt oder eine Liste von Punkten sein')
    return
  end

  for _, target in ipairs(targets) do
    if target and target.coords and #(target.coords) >= 0.1 then
      exports.ox_target:addBoxZone({
        coords = target.coords,
        size = target.size or vec3(2.0, 2.0, 2.0),
        rotation = target.rotation or 0.0,
        debug = false,
        options = {
          {
            name = 'rex_order_open',
            icon = 'fa-solid fa-utensils',
            label = 'Bestellkarte öffnen',
            distance = target.distance or 2.5,
            onSelect = function()
              startTabletEmote()
            end,
          },
        },
      })
    else
      print('[order] Ungültiger Eintrag in Config.orderTarget: ' .. tostring(target))
    end
  end
end)

RegisterNetEvent('rex_order:loginResult', function(result)
  if result.error then
    SendNUIMessage({ action = 'authFailed', message = result.error, loginUrl = result.loginUrl })
    return
  end

  SendNUIMessage({ action = 'authSuccess', url = result.url })
end)

RegisterNUICallback('startAuth', function(_, callback)
  SendNUIMessage({ action = 'authenticating' })
  TriggerServerEvent('rex_order:requestLogin')
  callback({ ok = true })
end)

RegisterNUICallback('NUIFocusOff', function(_, callback)
  closeNui()
  callback({ ok = true })
end)

RegisterNUICallback('close', function(_, callback)
  closeNui()
  callback({ ok = true })
end)