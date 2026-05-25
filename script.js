const canvas = document.getElementById("solarCanvas");
const ctx = canvas.getContext("2d");

const pauseResumeBtn = document.getElementById("pauseResumeBtn");
const speedSlider = document.getElementById("speedSlider");
const speedSliderValue = document.getElementById("speedSliderValue");

const inspectorMessage = document.getElementById("inspectorMessage");
const inspectorName = document.getElementById("inspectorName");
const inspectorOrbitRadius = document.getElementById("inspectorOrbitRadius");
const inspectorOrbitSpeed = document.getElementById("inspectorOrbitSpeed");
const inspectorAngle = document.getElementById("inspectorAngle");
const inspectorDistance = document.getElementById("inspectorDistance");

const simulation = {
  isPaused: false,
  simulationSpeed: 1,
  lastTimestamp: 0,
  viewportWidth: 0,
  viewportHeight: 0,
  sunBaseRadius: 34,
  sunPulseTime: 0,
  starTime: 0,
  gravityFieldTime: 0,
  gravityPulse: 0,
  gravityGlowRadius: 120,
  gravityRingRadii: [],
  hoveredPlanet: null,
  focusedPlanet: null,
  initialized: false,
};

const stars = [];

const camera = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  targetOffsetX: 0,
  targetOffsetY: 0,
  targetZoom: 1,
  minZoom: 0.4,
  maxZoom: 4,
  defaultZoom: 1,
};

const pointer = {
  x: -1,
  y: -1,
  isDragging: false,
  movedDuringDrag: false,
  dragStartX: 0,
  dragStartY: 0,
  startOffsetX: 0,
  startOffsetY: 0,
};

const planets = [
  {
    name: "Mercury",
    color: "#a9a7a0",
    radius: 4,
    orbitRadius: 60,
    orbitSpeed: 4.8,
    angle: 0,
    x: 0,
    y: 0,
    trail: [],
    maxTrailLength: 80,
  },
  {
    name: "Venus",
    color: "#d7b27a",
    radius: 6,
    orbitRadius: 85,
    orbitSpeed: 3.5,
    angle: Math.PI * 0.3,
    x: 0,
    y: 0,
    trail: [],
    maxTrailLength: 80,
  },
  {
    name: "Earth",
    color: "#4d89d8",
    radius: 7,
    orbitRadius: 115,
    orbitSpeed: 3,
    angle: Math.PI * 0.4,
    x: 0,
    y: 0,
    trail: [],
    maxTrailLength: 85,
    moon: {
      color: "#d9dde7",
      radius: 2.5,
      orbitRadius: 18,
      orbitSpeed: 7.2,
      angle: 0,
      x: 0,
      y: 0,
    },
  },
  {
    name: "Mars",
    color: "#c66f4b",
    radius: 5,
    orbitRadius: 145,
    orbitSpeed: 2.4,
    angle: Math.PI * 1.1,
    x: 0,
    y: 0,
    trail: [],
    maxTrailLength: 85,
  },
  {
    name: "Jupiter",
    color: "#d6a575",
    radius: 12,
    orbitRadius: 190,
    orbitSpeed: 1.3,
    angle: Math.PI * 1.5,
    x: 0,
    y: 0,
    trail: [],
    maxTrailLength: 90,
  },
  {
    name: "Saturn",
    color: "#d9c08f",
    radius: 10,
    orbitRadius: 230,
    orbitSpeed: 1,
    angle: Math.PI * 0.9,
    x: 0,
    y: 0,
    trail: [],
    maxTrailLength: 95,
  },
  {
    name: "Uranus",
    color: "#8dcfda",
    radius: 8,
    orbitRadius: 265,
    orbitSpeed: 0.7,
    angle: Math.PI * 1.8,
    x: 0,
    y: 0,
    trail: [],
    maxTrailLength: 100,
  },
  {
    name: "Neptune",
    color: "#4f78d6",
    radius: 8,
    orbitRadius: 300,
    orbitSpeed: 0.55,
    angle: Math.PI * 0.15,
    x: 0,
    y: 0,
    trail: [],
    maxTrailLength: 100,
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(current, target, amount) {
  return current + (target - current) * amount;
}

function getPlanetRadius(planet, includeHover = true) {
  const hoverBoost = includeHover && simulation.hoveredPlanet === planet ? 1.22 : 1;
  return planet.radius * hoverBoost;
}

function worldToScreen(x, y) {
  return {
    x: (x + camera.offsetX) * camera.zoom + simulation.viewportWidth / 2,
    y: (y + camera.offsetY) * camera.zoom + simulation.viewportHeight / 2,
  };
}

function screenToWorld(x, y) {
  return {
    x: (x - simulation.viewportWidth / 2) / camera.zoom - camera.offsetX,
    y: (y - simulation.viewportHeight / 2) / camera.zoom - camera.offsetY,
  };
}

function updateSpeedLabel() {
  speedSliderValue.textContent = `${simulation.simulationSpeed.toFixed(1)}x`;
}

function updatePauseButtonIcon() {
  if (simulation.isPaused) {
    pauseResumeBtn.innerHTML = "&#9654;";
    pauseResumeBtn.setAttribute("aria-label", "Resume animation");
    pauseResumeBtn.setAttribute("title", "Resume animation");
    return;
  }

  pauseResumeBtn.innerHTML = "&#10074;&#10074;";
  pauseResumeBtn.setAttribute("aria-label", "Pause animation");
  pauseResumeBtn.setAttribute("title", "Pause animation");
}

function initializeStarfield() {
  stars.length = 0;

  const area = simulation.viewportWidth * simulation.viewportHeight;
  const starCount = clamp(Math.round(area / 4200), 120, 280);

  for (let i = 0; i < starCount; i += 1) {
    stars.push({
      x: Math.random() * simulation.viewportWidth,
      y: Math.random() * simulation.viewportHeight,
      baseAlpha: 0.2 + Math.random() * 0.45,
      twinkleSpeed: 0.8 + Math.random() * 2.4,
      twinkleVariation: 0.08 + Math.random() * 0.15,
      size: 0.8 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      currentAlpha: 0.3,
    });
  }
}

function clearInspector() {
  inspectorMessage.textContent = "Click a planet to inspect it.";
  inspectorName.textContent = "-";
  inspectorOrbitRadius.textContent = "-";
  inspectorOrbitSpeed.textContent = "-";
  inspectorAngle.textContent = "-";
  inspectorDistance.textContent = "-";
}

function updateInspector(planet) {
  if (!planet) {
    clearInspector();
    return;
  }

  inspectorMessage.textContent = "Selected planet data:";
  inspectorName.textContent = planet.name;
  inspectorOrbitRadius.textContent = `${planet.orbitRadius.toFixed(1)} units`;
  inspectorOrbitSpeed.textContent = `${planet.orbitSpeed.toFixed(2)} rad/s`;
  inspectorAngle.textContent = `${((planet.angle % (Math.PI * 2)) * 180 / Math.PI).toFixed(1)} deg`;
  inspectorDistance.textContent = `${Math.hypot(planet.x, planet.y).toFixed(1)} units`;
}

function setFocusPlanet(planet) {
  simulation.focusedPlanet = planet;

  if (!planet) {
    camera.targetOffsetX = 0;
    camera.targetOffsetY = 0;
    camera.targetZoom = camera.defaultZoom;
    updateInspector(null);
    return;
  }

  camera.targetOffsetX = -planet.x;
  camera.targetOffsetY = -planet.y;
  camera.targetZoom = clamp(Math.max(camera.defaultZoom * 1.35, 1.2), camera.minZoom, camera.maxZoom);
  updateInspector(planet);
}

function findPlanetAtScreenPoint(screenX, screenY) {
  const worldPoint = screenToWorld(screenX, screenY);

  for (let i = planets.length - 1; i >= 0; i -= 1) {
    const planet = planets[i];
    const dx = worldPoint.x - planet.x;
    const dy = worldPoint.y - planet.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= getPlanetRadius(planet, false) + 2) {
      return planet;
    }
  }

  return null;
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
  const largestOrbitRadius = Math.max(...planets.map((planet) => planet.orbitRadius));

  canvas.width = Math.floor(displayWidth * dpr);
  canvas.height = Math.floor(displayHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  simulation.viewportWidth = displayWidth;
  simulation.viewportHeight = displayHeight;
  initializeStarfield();

  camera.defaultZoom = clamp((Math.min(displayWidth, displayHeight) * 0.46) / (largestOrbitRadius + 20), 0.5, 2);

  if (!simulation.initialized) {
    camera.zoom = camera.defaultZoom;
    camera.targetZoom = camera.defaultZoom;
    simulation.initialized = true;
  } else if (!simulation.focusedPlanet) {
    camera.targetZoom = camera.defaultZoom;
  }
}

// ===== APPLICATION STAGE =====
// Input and UI handling for simulation control and camera interactions.
pauseResumeBtn.addEventListener("click", () => {
  simulation.isPaused = !simulation.isPaused;
  updatePauseButtonIcon();
});

speedSlider.addEventListener("input", () => {
  simulation.simulationSpeed = Number(speedSlider.value);
  updateSpeedLabel();
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;

  if (pointer.isDragging) {
    const dx = pointer.x - pointer.dragStartX;
    const dy = pointer.y - pointer.dragStartY;

    if (Math.hypot(dx, dy) > 2) {
      pointer.movedDuringDrag = true;
    }

    camera.offsetX = pointer.startOffsetX + dx / camera.zoom;
    camera.offsetY = pointer.startOffsetY + dy / camera.zoom;
    camera.targetOffsetX = camera.offsetX;
    camera.targetOffsetY = camera.offsetY;
    simulation.focusedPlanet = null;
  }
});

canvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;

  pointer.isDragging = true;
  pointer.movedDuringDrag = false;
  pointer.dragStartX = pointer.x;
  pointer.dragStartY = pointer.y;
  pointer.startOffsetX = camera.offsetX;
  pointer.startOffsetY = camera.offsetY;
});

window.addEventListener("mouseup", () => {
  pointer.isDragging = false;
});

canvas.addEventListener("mouseleave", () => {
  pointer.x = -1;
  pointer.y = -1;
  simulation.hoveredPlanet = null;
});

canvas.addEventListener("click", (event) => {
  if (pointer.movedDuringDrag) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  const selectedPlanet = findPlanetAtScreenPoint(localX, localY);
  setFocusPlanet(selectedPlanet);
});

canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    pointer.x = localX;
    pointer.y = localY;

    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const oldZoom = camera.zoom;
    const newZoom = clamp(oldZoom * zoomFactor, camera.minZoom, camera.maxZoom);

    if (newZoom === oldZoom) {
      return;
    }

    const beforeZoom = screenToWorld(localX, localY);
    camera.zoom = newZoom;
    camera.targetZoom = newZoom;
    const afterZoom = screenToWorld(localX, localY);

    
    camera.offsetX += beforeZoom.x - afterZoom.x;
    camera.offsetY += beforeZoom.y - afterZoom.y;
    camera.targetOffsetX = camera.offsetX;
    camera.targetOffsetY = camera.offsetY;
    simulation.focusedPlanet = null;
  },
  { passive: false }
);

window.addEventListener("resize", resizeCanvas);

function updateHoveredPlanet() {
  simulation.hoveredPlanet = findPlanetAtScreenPoint(pointer.x, pointer.y);
}

function updateTrails() {
  for (const planet of planets) {
    const trail = planet.trail;
    const lastPoint = trail[trail.length - 1];

    if (!lastPoint || Math.hypot(planet.x - lastPoint.x, planet.y - lastPoint.y) >= 0.7) {
      trail.push({ x: planet.x, y: planet.y });
    }

    if (trail.length > planet.maxTrailLength) {
      trail.shift();
    }
  }
}

function drawSun() {
  const pulseScale = 1 + Math.sin(simulation.sunPulseTime * 2.2) * 0.05;
  const sunRadius = simulation.sunBaseRadius * pulseScale;

  const gradient = ctx.createRadialGradient(0, 0, sunRadius * 0.25, 0, 0, sunRadius * 2.4);
  gradient.addColorStop(0, "#fff8bf");
  gradient.addColorStop(0.42, "#ffd65f");
  gradient.addColorStop(1, "rgba(255, 170, 30, 0)");

  ctx.beginPath();
  ctx.fillStyle = gradient;
  ctx.arc(0, 0, sunRadius * 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "#ffcc4d";
  ctx.arc(0, 0, sunRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawStarfield() {
  for (const star of stars) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(230, 242, 255, ${star.currentAlpha.toFixed(3)})`;
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGravityField() {
  const glowGradient = ctx.createRadialGradient(0, 0, simulation.sunBaseRadius * 0.8, 0, 0, simulation.gravityGlowRadius);
  glowGradient.addColorStop(0, "rgba(255, 210, 92, 0.18)");
  glowGradient.addColorStop(0.45, "rgba(255, 180, 82, 0.08)");
  glowGradient.addColorStop(1, "rgba(255, 140, 70, 0)");

  ctx.beginPath();
  ctx.fillStyle = glowGradient;
  ctx.arc(0, 0, simulation.gravityGlowRadius, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < simulation.gravityRingRadii.length; i += 1) {
    const radius = simulation.gravityRingRadii[i];
    const alpha = 0.12 - i * 0.02;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 198, 110, ${Math.max(0.02, alpha).toFixed(3)})`;
    ctx.lineWidth = 1 / camera.zoom;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawOrbitPath(orbitRadius) {
  ctx.beginPath();
  ctx.strokeStyle = "rgba(200, 220, 255, 0.2)";
  ctx.lineWidth = 1 / camera.zoom;
  ctx.arc(0, 0, orbitRadius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTrail(planet) {
  const trail = planet.trail;

  for (let i = 0; i < trail.length; i += 1) {
    const point = trail[i];
    const alpha = ((i + 1) / trail.length) * 0.35;

    ctx.beginPath();
    ctx.fillStyle = `${planet.color}${Math.floor(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.arc(point.x, point.y, Math.max(0.8, planet.radius * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlanet(planet) {
  const radius = getPlanetRadius(planet, true);

  if (simulation.hoveredPlanet === planet) {
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.arc(planet.x, planet.y, radius * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.fillStyle = planet.color;
  ctx.arc(planet.x, planet.y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (planet.name === "Saturn") {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(220, 205, 165, 0.75)";
    ctx.lineWidth = 1.5 / camera.zoom;
    ctx.ellipse(planet.x, planet.y, radius * 2, radius * 0.82, Math.PI * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMoon(planet) {
  if (!planet.moon) {
    return;
  }

  ctx.beginPath();
  ctx.strokeStyle = "rgba(210, 216, 230, 0.32)";
  ctx.lineWidth = 1 / camera.zoom;
  ctx.arc(planet.x, planet.y, planet.moon.orbitRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = planet.moon.color;
  ctx.arc(planet.moon.x, planet.moon.y, planet.moon.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawHoverLabel() {
  if (!simulation.hoveredPlanet) {
    return;
  }

  const screenPos = worldToScreen(simulation.hoveredPlanet.x, simulation.hoveredPlanet.y);
  const text = simulation.hoveredPlanet.name;

  ctx.save();
  ctx.font = "600 13px Segoe UI";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const textWidth = ctx.measureText(text).width;
  const paddingX = 8;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = 24;
  const x = clamp(screenPos.x + 12, 8, simulation.viewportWidth - boxWidth - 8);
  const y = clamp(screenPos.y + 12, 8, simulation.viewportHeight - boxHeight - 8);

  ctx.fillStyle = "rgba(6, 12, 28, 0.86)";
  ctx.fillRect(x, y, boxWidth, boxHeight);

  ctx.strokeStyle = "rgba(180, 208, 255, 0.75)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, boxWidth, boxHeight);

  ctx.fillStyle = "#e9f1ff";
  ctx.fillText(text, x + paddingX, y + boxHeight / 2 + 0.5);
  ctx.restore();
}

function animate(timestamp) {
  // ===== APPLICATION STAGE =====
  if (!simulation.lastTimestamp) {
    simulation.lastTimestamp = timestamp;
  }

  const deltaSeconds = (timestamp - simulation.lastTimestamp) / 1000;
  simulation.lastTimestamp = timestamp;
  const effectiveDelta = Math.min(0.05, deltaSeconds);

  simulation.sunPulseTime += effectiveDelta;
  simulation.starTime += effectiveDelta;
  simulation.gravityFieldTime += effectiveDelta;

  if (!simulation.isPaused) {
    for (const planet of planets) {
      planet.angle += planet.orbitSpeed * effectiveDelta * simulation.simulationSpeed;

      if (planet.moon) {
        planet.moon.angle += planet.moon.orbitSpeed * effectiveDelta * simulation.simulationSpeed;
      }
    }
  }

  if (simulation.focusedPlanet) {
    camera.targetOffsetX = -simulation.focusedPlanet.x;
    camera.targetOffsetY = -simulation.focusedPlanet.y;
  }

  const cameraBlend = 1 - Math.exp(-7 * effectiveDelta);
  camera.offsetX = lerp(camera.offsetX, camera.targetOffsetX, cameraBlend);
  camera.offsetY = lerp(camera.offsetY, camera.targetOffsetY, cameraBlend);
  camera.zoom = lerp(camera.zoom, camera.targetZoom, cameraBlend);


  simulation.gravityPulse = (Math.sin(simulation.gravityFieldTime * 1.25) + 1) * 0.5;

  // ===== GEOMETRY STAGE =====
  for (const planet of planets) {
    planet.x = planet.orbitRadius * Math.cos(planet.angle);
    planet.y = planet.orbitRadius * Math.sin(planet.angle);

    if (planet.moon) {
      planet.moon.x = planet.x + planet.moon.orbitRadius * Math.cos(planet.moon.angle);
      planet.moon.y = planet.y + planet.moon.orbitRadius * Math.sin(planet.moon.angle);
    }
  }

  // Star twinkle geometry: 
  for (const star of stars) {
    const twinkle = Math.sin(simulation.starTime * star.twinkleSpeed + star.phase) * star.twinkleVariation;
    star.currentAlpha = clamp(star.baseAlpha + twinkle, 0.06, 0.95);
  }

  // Gravity illusion geometry values 
  simulation.gravityGlowRadius = simulation.sunBaseRadius * (3 + simulation.gravityPulse * 0.65);
  simulation.gravityRingRadii = [
    simulation.sunBaseRadius * (1.8 + simulation.gravityPulse * 0.25),
    simulation.sunBaseRadius * (2.5 + simulation.gravityPulse * 0.35),
    simulation.sunBaseRadius * (3.3 + simulation.gravityPulse * 0.5),
    simulation.sunBaseRadius * (4.1 + simulation.gravityPulse * 0.65),
  ];

  updateTrails();
  updateHoveredPlanet();
  updateInspector(simulation.focusedPlanet);

  // ===== RASTERIZATION STAGE =====
  ctx.clearRect(0, 0, simulation.viewportWidth, simulation.viewportHeight);

  drawStarfield();

  ctx.save();
  ctx.translate(simulation.viewportWidth / 2, simulation.viewportHeight / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(camera.offsetX, camera.offsetY);

  drawGravityField();

  for (const planet of planets) {
    drawOrbitPath(planet.orbitRadius);
  }

  drawSun();

  for (const planet of planets) {
    drawTrail(planet);
    drawPlanet(planet);
    drawMoon(planet);
  }

  ctx.restore();

  drawHoverLabel();

  requestAnimationFrame(animate);
}

resizeCanvas();
updateSpeedLabel();
updatePauseButtonIcon();
clearInspector();
requestAnimationFrame(animate);
