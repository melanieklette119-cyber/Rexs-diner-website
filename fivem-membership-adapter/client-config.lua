Config = Config or {}

Config.orderTarget = {
  {
    coords = vec3(2542.36, 2638.91, 37.94), -- Kasse
    size = vec3(2.0, 2.0, 2.0),
    rotation = 0.0,
    distance = 2.5,
    path = '/bestellen', -- Optional: z. B. '/admin'
  },
  {
    coords = vec3(2537.60, 2586.89, 38.70), -- Werkstatt
    size = vec3(2.0, 2.0, 2.0),
    rotation = 0.0,
    distance = 2.5,
    path = '/werkstatt', -- Optional: z. B. '/admin'
  },
  {
    coords = vec3(2532.90, 2584.05, 38.99), -- Küche
    size = vec3(2.0, 2.0, 2.0),
    rotation = 0.0,
    distance = 2.5,
    path = '/admin', -- Optional: z. B. '/admin'
  },
}
