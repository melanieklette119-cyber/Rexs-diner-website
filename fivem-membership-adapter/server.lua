local Config = {
  adapterUrl = GetConvar('membership_adapter_url', ''),
  cronSecret = GetConvar('membership_cron_secret', ''),
  intervalMs = 60 * 60 * 1000
}

local function chargeBankAccount(bankAccountId, amount)
  print(('[membership] TEST MODE: would charge %s %.2f'):format(bankAccountId, amount))
  return true
end

local function processCharges()
  if Config.adapterUrl == '' or Config.cronSecret == '' then return end
  PerformHttpRequest(Config.adapterUrl .. '/api/memberships/charges', function(status, body)
    if status ~= 200 then print(('[membership] fetch failed: %s'):format(status)); return end
    local payload = json.decode(body or '{}') or {}
    for _, charge in ipairs(payload.charges or {}) do
      local plan = charge.membership_plans or {}
      local amount = tonumber(plan.price or 0) or 0
      local success = chargeBankAccount(charge.fivem_bank_account_id, amount)
      local result = json.encode({ contractId = charge.id, idempotencyKey = charge.idempotencyKey, status = success and 'succeeded' or 'failed', errorMessage = success and nil or 'Bankkonto konnte nicht belastet werden' })
      PerformHttpRequest(Config.adapterUrl .. '/api/memberships/charges', function() end, 'POST', result, { ['Content-Type'] = 'application/json', ['x-membership-cron-secret'] = Config.cronSecret })
    end
  end, 'GET', '', { ['x-membership-cron-secret'] = Config.cronSecret })
end

CreateThread(function()
  while true do
    processCharges()
    Wait(Config.intervalMs)
  end
end)
