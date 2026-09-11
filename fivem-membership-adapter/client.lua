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

  local target = Config.orderTarget
  if not target or not target.coords or #(target.coords) < 0.1 then
    print('[order] Config.orderTarget.coords muss auf den Rex-Diner-Standort gesetzt werden')
    return
  end

  exports.ox_target:addBoxZone({
    coords = target.coords,
    size = target.size,
    rotation = target.rotation,
    debug = false,
    options = {
      {
        name = 'rex_order_open',
        icon = 'fa-solid fa-utensils',
        label = 'Bestellkarte öffnen',
        distance = target.distance,
        onSelect = function()
          TriggerServerEvent('rex_order:requestLogin')
        end,
      },
    },
  })
end)

RegisterNetEvent('rex_order:loginResult', function(result)
  if result.error then
    lib.notify({ title = "Rex's Diner", description = result.error, type = 'error' })
    return
  end

  SetNuiFocus(true, true)
  SendNUIMessage({ action = 'open', url = result.url })
end)

RegisterNUICallback('close', function(_, callback)
  SetNuiFocus(false, false)
  SendNUIMessage({ action = 'close' })
  callback({ ok = true })
end)