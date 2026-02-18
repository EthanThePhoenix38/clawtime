/* AVATAR_META {"name": "Rainbow Macaw", "emoji": "🦜", "description": "Colorful tropical parrot", "color": "ef4444"} */

(function() {
  'use strict';

  var scene, camera, renderer, character;
  var leftEye, rightEye, leftPupil, rightPupil, mouth;
  var leftWing, rightWing, tail;
  var crest;
  var clock = new THREE.Clock();
  var currentState = 'idle';
  var connectionState = 'connecting';
  var isInitialized = false;
  var avatarFlash = document.getElementById('avatarFlash');
  var thinkingStartTime = 0;
  var workingTransitionMs = 3000;

  var statusRing, statusRingMat, platformMat, outerGlowMat;

  function getAccentRGB() {
    var hex = (window.CFG && window.CFG.themeAccent) || 'ef4444';
    var r = parseInt(hex.slice(0, 2), 16) / 255;
    var g = parseInt(hex.slice(2, 4), 16) / 255;
    var b = parseInt(hex.slice(4, 6), 16) / 255;
    return { r: r, g: g, b: b };
  }
  
  function getDimAccent() {
    var c = getAccentRGB();
    return { r: c.r * 0.4, g: c.g * 0.4, b: c.b * 0.4 };
  }
  
  var connColors = {
    online:     null,
    connecting: null,
    offline:    null
  };
  var connCurrent = { r: 0.5, g: 0.5, b: 0.5 };
  var connTarget  = { r: 0.5, g: 0.5, b: 0.5 };

  function initScene() {
    if (isInitialized) return;

    var container = document.getElementById('avatarCanvas');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1318);

    var w = container.clientWidth;
    var h = container.clientHeight;
    camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    adjustCameraForPanel(w, h);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    var ambient = new THREE.AmbientLight(0x606080, 1.5);
    scene.add(ambient);

    var mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(4, 10, 6);
    mainLight.castShadow = true;
    scene.add(mainLight);

    var fillLight = new THREE.DirectionalLight(0x88aaff, 0.8);
    fillLight.position.set(-4, 3, -4);
    scene.add(fillLight);
    
    var frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
    frontLight.position.set(0, 5, 10);
    scene.add(frontLight);

    character = new THREE.Group();
    buildCharacter();
    scene.add(character);
    storeOriginalColors();

    // Platform
    var accentHex = parseInt((window.CFG && window.CFG.themeAccent) || 'ef4444', 16);
    var platformGroup = new THREE.Group();
    
    var baseGeo = new THREE.CircleGeometry(3.0, 64);
    var baseMat = new THREE.MeshLambertMaterial({ color: 0x1a1d24 });
    var basePlatform = new THREE.Mesh(baseGeo, baseMat);
    basePlatform.rotation.x = -Math.PI / 2;
    basePlatform.position.y = -0.02;
    platformGroup.add(basePlatform);
    
    var innerGeo = new THREE.CircleGeometry(2.5, 64);
    platformMat = new THREE.MeshLambertMaterial({ color: 0x22262e });
    var innerPlatform = new THREE.Mesh(innerGeo, platformMat);
    innerPlatform.rotation.x = -Math.PI / 2;
    innerPlatform.position.y = 0.01;
    platformGroup.add(innerPlatform);
    
    var ringGeo = new THREE.RingGeometry(2.45, 2.55, 64);
    statusRingMat = new THREE.MeshBasicMaterial({ 
      color: accentHex, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    statusRing = new THREE.Mesh(ringGeo, statusRingMat);
    statusRing.rotation.x = -Math.PI / 2;
    statusRing.position.y = 0.02;
    platformGroup.add(statusRing);
    
    var outerGlowGeo = new THREE.RingGeometry(2.55, 3.0, 64);
    outerGlowMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15
    });
    var outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
    outerGlow.rotation.x = -Math.PI / 2;
    outerGlow.position.y = 0.015;
    platformGroup.add(outerGlow);
    
    scene.add(platformGroup);

    window.addEventListener('resize', onResize);

    isInitialized = true;
    animate();
  }

  function adjustCameraForPanel(w, h) {
    var aspect = w / h;
    if (aspect < 0.7) {
      camera.position.set(0, 6, 18);
      camera.fov = 35;
    } else if (aspect < 1.0) {
      camera.position.set(0, 5, 16);
      camera.fov = 38;
    } else {
      camera.position.set(0, 4, 14);
      camera.fov = 40;
    }
    camera.lookAt(0, 3.5, 0);
    camera.updateProjectionMatrix();
  }

  window.adjustAvatarCamera = function() {
    if (!camera || !renderer) return;
    var container = document.getElementById('avatarCanvas');
    if (!container) return;
    var w = container.clientWidth;
    var h = container.clientHeight;
    adjustCameraForPanel(w, h);
    renderer.setSize(w, h);
  };

  function onResize() {
    var container = document.getElementById('avatarCanvas');
    if (!container || !camera || !renderer) return;
    var w = container.clientWidth;
    var h = container.clientHeight;
    camera.aspect = w / h;
    adjustCameraForPanel(w, h);
    renderer.setSize(w, h);
  }

  function buildCharacter() {
    // Rainbow macaw colors
    var red     = 0xef4444;
    var orange  = 0xf97316;
    var yellow  = 0xfbbf24;
    var green   = 0x22c55e;
    var blue    = 0x3b82f6;
    var darkBlue = 0x1e40af;
    var white   = 0xffffff;
    var dark    = 0x1a1a2e;
    var cream   = 0xfef3c7;
    var beak    = 0x1f2937;

    function box(w, h, d, color, emissive) {
      var geo = new THREE.BoxGeometry(w, h, d);
      var opts = { color: color };
      if (emissive) {
        opts.emissive = emissive;
        opts.emissiveIntensity = 0.3;
      }
      return new THREE.Mesh(geo, new THREE.MeshLambertMaterial(opts));
    }

    // Perch/branch
    var perch = box(4, 0.5, 0.5, 0x8B4513);
    perch.position.set(0, 0.25, 0);
    character.add(perch);

    // Feet
    var leftFoot = box(0.4, 0.3, 0.6, 0x4a4a4a);
    leftFoot.position.set(-0.5, 0.6, 0.1);
    character.add(leftFoot);

    var rightFoot = box(0.4, 0.3, 0.6, 0x4a4a4a);
    rightFoot.position.set(0.5, 0.6, 0.1);
    character.add(rightFoot);

    // Legs
    var leftLeg = box(0.2, 0.8, 0.2, 0x4a4a4a);
    leftLeg.position.set(-0.5, 1.1, 0);
    character.add(leftLeg);

    var rightLeg = box(0.2, 0.8, 0.2, 0x4a4a4a);
    rightLeg.position.set(0.5, 1.1, 0);
    character.add(rightLeg);

    // Tail feathers (long, colorful)
    tail = new THREE.Group();
    
    var tailRed = box(0.6, 0.2, 2.5, red);
    tailRed.position.set(0, 0, -1.25);
    tail.add(tailRed);
    
    var tailBlue = box(0.5, 0.15, 2.2, blue);
    tailBlue.position.set(-0.3, -0.1, -1.1);
    tail.add(tailBlue);
    
    var tailBlue2 = box(0.5, 0.15, 2.2, blue);
    tailBlue2.position.set(0.3, -0.1, -1.1);
    tail.add(tailBlue2);
    
    var tailYellow = box(0.4, 0.1, 1.8, yellow);
    tailYellow.position.set(0, 0.1, -0.9);
    tail.add(tailYellow);
    
    tail.position.set(0, 2.0, -0.8);
    tail.rotation.x = 0.3;
    character.add(tail);

    // Body (round parrot body) - layered colors
    var bodyRed = box(2.0, 2.2, 1.8, red);
    bodyRed.position.set(0, 2.8, 0);
    character.add(bodyRed);

    // Belly (lighter)
    var belly = box(1.4, 1.6, 0.3, 0xfca5a5);
    belly.position.set(0, 2.6, 0.85);
    character.add(belly);

    // Wing bands - left wing
    leftWing = new THREE.Group();
    
    var lwRed = box(0.3, 1.6, 1.2, red);
    lwRed.position.set(0, 0, 0);
    leftWing.add(lwRed);
    
    var lwOrange = box(0.25, 0.4, 1.1, orange);
    lwOrange.position.set(0.05, -0.5, 0);
    leftWing.add(lwOrange);
    
    var lwYellow = box(0.25, 0.4, 1.0, yellow);
    lwYellow.position.set(0.1, -0.9, 0);
    leftWing.add(lwYellow);
    
    var lwGreen = box(0.25, 0.4, 0.9, green);
    lwGreen.position.set(0.15, -1.3, 0);
    leftWing.add(lwGreen);
    
    var lwBlue = box(0.25, 0.5, 0.8, blue);
    lwBlue.position.set(0.2, -1.7, 0);
    leftWing.add(lwBlue);
    
    leftWing.position.set(-1.2, 3.2, -0.2);
    leftWing.rotation.z = 0.2;
    character.add(leftWing);
    window._leftArm = leftWing;

    // Right wing
    rightWing = new THREE.Group();
    
    var rwRed = box(0.3, 1.6, 1.2, red);
    rwRed.position.set(0, 0, 0);
    rightWing.add(rwRed);
    
    var rwOrange = box(0.25, 0.4, 1.1, orange);
    rwOrange.position.set(-0.05, -0.5, 0);
    rightWing.add(rwOrange);
    
    var rwYellow = box(0.25, 0.4, 1.0, yellow);
    rwYellow.position.set(-0.1, -0.9, 0);
    rightWing.add(rwYellow);
    
    var rwGreen = box(0.25, 0.4, 0.9, green);
    rwGreen.position.set(-0.15, -1.3, 0);
    rightWing.add(rwGreen);
    
    var rwBlue = box(0.25, 0.5, 0.8, blue);
    rwBlue.position.set(-0.2, -1.7, 0);
    rightWing.add(rwBlue);
    
    rightWing.position.set(1.2, 3.2, -0.2);
    rightWing.rotation.z = -0.2;
    character.add(rightWing);
    window._rightArm = rightWing;

    // Head (rounder)
    var head = box(1.8, 1.6, 1.4, red);
    head.position.set(0, 4.8, 0.3);
    character.add(head);

    // White face patch (macaw characteristic)
    var facePatch = box(1.4, 1.2, 0.2, white);
    facePatch.position.set(0, 4.7, 0.95);
    character.add(facePatch);

    // Beak - upper (curved, dark)
    var upperBeak = box(0.6, 0.5, 0.8, beak);
    upperBeak.position.set(0, 4.5, 1.3);
    upperBeak.rotation.x = 0.3;
    character.add(upperBeak);

    // Beak - lower
    var lowerBeak = box(0.4, 0.25, 0.5, 0x374151);
    lowerBeak.position.set(0, 4.2, 1.2);
    character.add(lowerBeak);

    // Eyes
    var eyeGeo = new THREE.BoxGeometry(0.45, 0.45, 0.2);
    var eyeMat = new THREE.MeshLambertMaterial({ color: white });

    leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.45, 5.0, 0.95);
    character.add(leftEye);

    rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.45, 5.0, 0.95);
    character.add(rightEye);

    // Pupils (dark)
    var pupilGeo = new THREE.BoxGeometry(0.2, 0.2, 0.15);
    var pupilMat = new THREE.MeshLambertMaterial({ color: dark });

    leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.45, 5.0, 1.08);
    character.add(leftPupil);

    rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.45, 5.0, 1.08);
    character.add(rightPupil);

    // Small crest feathers on top of head
    crest = new THREE.Group();
    
    var crestRed = box(0.15, 0.6, 0.15, red);
    crestRed.position.set(0, 0.3, 0);
    crestRed.rotation.x = -0.2;
    crest.add(crestRed);
    
    var crestYellow = box(0.12, 0.5, 0.12, yellow);
    crestYellow.position.set(-0.2, 0.25, 0);
    crestYellow.rotation.x = -0.3;
    crestYellow.rotation.z = 0.2;
    crest.add(crestYellow);
    
    var crestYellow2 = box(0.12, 0.5, 0.12, yellow);
    crestYellow2.position.set(0.2, 0.25, 0);
    crestYellow2.rotation.x = -0.3;
    crestYellow2.rotation.z = -0.2;
    crest.add(crestYellow2);
    
    crest.position.set(0, 5.6, 0);
    character.add(crest);

    // Mouth (hidden by default, for expressions)
    mouth = box(0.4, 0.2, 0.1, dark);
    mouth.position.set(0, 4.35, 1.35);
    mouth.visible = false;
    character.add(mouth);

    character.position.y = 0;
  }

  // Store original colors for state changes
  var originalColors = {};
  function storeOriginalColors() {
    character.traverse(function(child) {
      if (child.isMesh && child.material) {
        originalColors[child.uuid] = child.material.color.getHex();
      }
    });
  }

  // Animation
  function animate() {
    requestAnimationFrame(animate);
    var delta = clock.getDelta();
    var elapsed = clock.getElapsedTime();

    updateConnectionColor(delta);
    updateState(elapsed, delta);

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function updateConnectionColor(delta) {
    var accent = getAccentRGB();
    var dim = getDimAccent();
    connColors.online = accent;
    connColors.connecting = accent;
    connColors.offline = dim;

    connTarget = connColors[connectionState] || connColors.offline;

    var speed = 3.0;
    connCurrent.r += (connTarget.r - connCurrent.r) * speed * delta;
    connCurrent.g += (connTarget.g - connCurrent.g) * speed * delta;
    connCurrent.b += (connTarget.b - connCurrent.b) * speed * delta;

    if (statusRingMat) {
      if (connectionState === 'connecting') {
        var pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 3);
        statusRingMat.opacity = 0.4 + pulse * 0.5;
      } else {
        statusRingMat.opacity = connectionState === 'online' ? 0.9 : 0.4;
      }
      statusRingMat.color.setRGB(connCurrent.r, connCurrent.g, connCurrent.b);
    }
    if (outerGlowMat) {
      outerGlowMat.color.setRGB(connCurrent.r, connCurrent.g, connCurrent.b);
      outerGlowMat.opacity = connectionState === 'online' ? 0.15 : 0.05;
    }
    if (platformMat) {
      var tintStrength = connectionState === 'online' ? 0.08 : 0.03;
      var baseColor = { r: 0x22/255, g: 0x26/255, b: 0x2e/255 };
      platformMat.color.setRGB(
        baseColor.r + connCurrent.r * tintStrength,
        baseColor.g + connCurrent.g * tintStrength,
        baseColor.b + connCurrent.b * tintStrength
      );
    }
  }

  function updateState(elapsed, delta) {
    if (!character) return;

    // Gentle body bob
    character.position.y = Math.sin(elapsed * 1.5) * 0.05;

    // Wing flap based on state
    var wingFlap = 0;
    var wingSpeed = 2;

    switch (currentState) {
      case 'idle':
        // Gentle sway
        character.rotation.y = Math.sin(elapsed * 0.5) * 0.1;
        if (tail) tail.rotation.x = 0.3 + Math.sin(elapsed) * 0.05;
        break;

      case 'thinking':
        // Head tilt, look around
        character.rotation.y = Math.sin(elapsed * 0.8) * 0.2;
        var thinkElapsed = Date.now() - thinkingStartTime;
        if (thinkElapsed > workingTransitionMs) {
          currentState = 'working';
        }
        break;

      case 'working':
      case 'coding':
        // Active wing movement
        wingFlap = Math.sin(elapsed * 4) * 0.15;
        character.rotation.y = Math.sin(elapsed * 0.5) * 0.05;
        break;

      case 'talking':
        // Beak movement, wing gesture
        wingFlap = Math.sin(elapsed * 3) * 0.1;
        if (mouth) {
          mouth.visible = Math.sin(elapsed * 12) > 0;
          mouth.scale.y = 0.5 + Math.abs(Math.sin(elapsed * 10)) * 0.5;
        }
        break;

      case 'listening':
        // Alert pose, head tilted
        character.rotation.y = 0.15;
        if (crest) {
          crest.children.forEach(function(f, i) {
            f.rotation.x = -0.4 - Math.sin(elapsed * 2 + i) * 0.1;
          });
        }
        break;

      case 'happy':
      case 'celebrating':
        // Excited wing flapping
        wingFlap = Math.sin(elapsed * 8) * 0.4;
        character.rotation.y = Math.sin(elapsed * 2) * 0.2;
        character.position.y += Math.abs(Math.sin(elapsed * 4)) * 0.2;
        break;

      case 'error':
      case 'frustrated':
        // Ruffled feathers
        wingFlap = Math.sin(elapsed * 6) * 0.2;
        character.rotation.z = Math.sin(elapsed * 8) * 0.05;
        break;

      case 'sleeping':
        // Wings tucked, head down
        character.rotation.x = 0.1;
        if (leftEye) leftEye.scale.y = 0.2;
        if (rightEye) rightEye.scale.y = 0.2;
        break;

      default:
        break;
    }

    // Apply wing animation
    if (leftWing) {
      leftWing.rotation.z = 0.2 + wingFlap;
    }
    if (rightWing) {
      rightWing.rotation.z = -0.2 - wingFlap;
    }

    // Eye tracking (subtle)
    var eyeMove = Math.sin(elapsed * 0.7) * 0.03;
    if (leftPupil) leftPupil.position.x = -0.45 + eyeMove;
    if (rightPupil) rightPupil.position.x = 0.45 + eyeMove;

    // Reset eyes if not sleeping
    if (currentState !== 'sleeping') {
      if (leftEye) leftEye.scale.y = 1;
      if (rightEye) rightEye.scale.y = 1;
    }

    // Hide mouth when not talking
    if (currentState !== 'talking' && mouth) {
      mouth.visible = false;
    }
  }

  // Public API
  window.setAvatarState = function(state) {
    if (state === 'thinking') {
      thinkingStartTime = Date.now();
    }
    currentState = state;
  };

  window.setAvatarConnection = function(state) {
    connectionState = state;
  };

  window.initAvatarScene = function() {
    initScene();
  };

})();
