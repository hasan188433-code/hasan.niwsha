import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  ArrowRight,
  Compass,
  Heart,
  Moon as MoonIcon,
  Star as StarIcon,
  X,
  Shield,
  Zap,
  Crosshair,
  Flame,
  ShoppingBag,
  Coins,
  ArrowUpCircle,
  Laptop,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Upload,
  FileCode,
  Check,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  GAME_CONFIG,
  GameStar,
  UPGRADE_CONFIG,
  PlayerUpgradesState,
  GameDifficulty,
  DIFFICULTY_PRESETS,
} from './config';
import { celestialAudio } from './audioEngine';
import { createBossSpaceshipModel, createCustomGLBBossModel, loadSavedHostBossModel, BossModelStructure } from './bossModel';
import { saveBossModelToCache, removeBossModelFromCache } from '../utils/idbStorage';
import { subscribeBossModel, saveBossModelRealtime } from '../services/realtimeSync';

interface SkyGameCanvasProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Projectile {
  mesh: THREE.Object3D;
  velocity: THREE.Vector3;
  life: number;
  damage: number;
  isPlayer: boolean;
  isHoming?: boolean;
  locked?: boolean;
}

// High-Performance Reusable Three.js Math Objects & Shared Geometries (Zero Heap Allocation)
const _tempVec3_1 = new THREE.Vector3();
const _tempVec3_2 = new THREE.Vector3();
const _tempVec3_3 = new THREE.Vector3();
const _tempVec3_4 = new THREE.Vector3();
const _tempQuat_1 = new THREE.Quaternion();
const _tempQuat_2 = new THREE.Quaternion();
const _tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _tempSphere = new THREE.Sphere();

// Shared Projectile Geometries & Materials
const sharedPlayerLaserGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.4, 6);
sharedPlayerLaserGeo.rotateX(Math.PI / 2);
const sharedPlayerLaserMat = new THREE.MeshBasicMaterial({
  color: 0x38bdf8,
  blending: THREE.AdditiveBlending,
});

const sharedBossBeamGeo = new THREE.CylinderGeometry(0.18, 0.18, 6.2, 6);
sharedBossBeamGeo.rotateX(Math.PI / 2);
const sharedBossBeamMatNormal = new THREE.MeshBasicMaterial({
  color: 0xff004c,
  blending: THREE.AdditiveBlending,
});
const sharedBossBeamMatRaged = new THREE.MeshBasicMaterial({
  color: 0xff4c00,
  blending: THREE.AdditiveBlending,
});

export const SkyGameCanvas: React.FC<SkyGameCanvasProps> = ({ isOpen, onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Game lifecycle states
  const [hasStarted, setHasStarted] = useState(false);
  const [controlMode, setControlMode] = useState<'desktop' | 'mobile'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 || 'ontouchstart' in window ? 'mobile' : 'desktop';
    }
    return 'desktop';
  });
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [activeStar, setActiveStar] = useState<GameStar | null>(null);
  const [isNearMoon, setIsNearMoon] = useState(false);
  const [isMoonLetterOpen, setIsMoonLetterOpen] = useState(false);
  const [discoveredStarIds, setDiscoveredStarIds] = useState<Set<string>>(new Set());
  const [hintText, setHintText] = useState(GAME_CONFIG.hints.explore);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  // Economy & Upgrades
  const [coins, setCoins] = useState(0);
  const [coinNotification, setCoinNotification] = useState<{ amount: number; text: string; id: number } | null>(null);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [upgrades, setUpgrades] = useState<PlayerUpgradesState>({
    bulletSpeedLevel: 1,
    bulletDamageLevel: 1,
    fireRateLevel: 1,
    maxHealthLevel: 1,
    magnetLevel: 1,
    engineSpeedLevel: 1,
  });

  // Discovered stars ref to strictly guard against double-rewarding coins
  const discoveredStarIdsRef = useRef<Set<string>>(new Set());

  // Difficulty Setting
  const [difficulty, setDifficulty] = useState<GameDifficulty>('normal');
  const difficultyRef = useRef<GameDifficulty>(difficulty);
  difficultyRef.current = difficulty;

  // Combat stats (Real-time synchronization)
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerMaxHealth, setPlayerMaxHealth] = useState(100);
  const [bossHealth, setBossHealth] = useState(GAME_CONFIG.boss.maxHealth);
  const [bossMaxHealth, setBossMaxHealth] = useState(GAME_CONFIG.boss.maxHealth);
  const [isBossActive, setIsBossActive] = useState(false);
  const [isBossDefeated, setIsBossDefeated] = useState(false);
  const [showVictoryCelebration, setShowVictoryCelebration] = useState(false);
  const [isPlayerHitFlash, setIsPlayerHitFlash] = useState(false);
  const [isAutoFire, setIsAutoFire] = useState(false);
  const [isTargetLocked, setIsTargetLocked] = useState(false);
  const [isInvincible, setIsInvincible] = useState(false);
  const isInvincibleRef = useRef(false);
  isInvincibleRef.current = isInvincible;

  // Custom GLB Boss Model state & file upload
  const [customModelFileName, setCustomModelFileName] = useState<string | null>(null);
  const [customModelStatus, setCustomModelStatus] = useState<string | null>(null);
  const customModelDataRef = useRef<BossModelStructure | null>(null);

  // Mobile Landscape Optimization State
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  useEffect(() => {
    const handleOrientationAndResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleOrientationAndResize);
    window.addEventListener('orientationchange', handleOrientationAndResize);
    handleOrientationAndResize();
    return () => {
      window.removeEventListener('resize', handleOrientationAndResize);
      window.removeEventListener('orientationchange', handleOrientationAndResize);
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyBossModelToScene = useCallback((modelStructure: BossModelStructure) => {
    if (!threeStateRef.current) return;
    const state = threeStateRef.current;
    const currentPos = state.bossGroup.position.clone();
    const currentQuat = state.bossGroup.quaternion.clone();

    state.scene.remove(state.bossGroup);

    const newGroup = modelStructure.group;
    newGroup.position.copy(currentPos);
    newGroup.quaternion.copy(currentQuat);
    newGroup.visible = state.bossState !== 'dead';
    state.scene.add(newGroup);

    state.bossGroup = newGroup;
    state.bossShieldMesh = modelStructure.shieldMesh;
    state.bossThrusters = modelStructure.thrusterLights;
    state.bossRings = modelStructure.rotatingRings;
    state.bossCannons = modelStructure.cannons;
    state.bossModelData = modelStructure;
  }, []);

  const handleGLBUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomModelStatus('در حال بارگذاری و پردازش مدل 3D...');
    try {
      const buffer = await file.arrayBuffer();
      const customStructure = await createCustomGLBBossModel(buffer);
      customModelDataRef.current = customStructure;
      setCustomModelFileName(file.name);
      setCustomModelStatus('در حال آپلود و ثبت در سرور برای اشتراک‌گذاری... ⏳');

      // Cache binary ArrayBuffer locally in IndexedDB (supports multi-megabyte files without localStorage quota limits)
      saveBossModelToCache('sky_custom_boss_glb', buffer).catch((err) => {
        console.warn('Local IndexedDB cache failed:', err);
      });

      // Convert to Base64 to POST to server for persistent multi-device access
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          const res = await fetch('/api/boss-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelBase64: base64data }),
          });
          if (res.ok) {
            setCustomModelStatus('سفینه اختصاصی با موفقیت روی هاست ذخیره و برای کلیه دستگاه‌ها فعال شد! ✅🛸');
            // Broadcast to Firestore so mobile and all connected clients get it in real-time
            saveBossModelRealtime({
              hasCustomModel: true,
              modelUrl: '/api/boss-model',
              fileName: file.name,
              updatedAt: Date.now(),
            }).catch(() => {});
          } else {
            const data = await res.json();
            setCustomModelStatus(`فعال‌سازی محلی انجام شد، اما ذخیره در سرور ناموفق بود: ${data.error || 'خطا در وب‌سرویس'}`);
          }
        } catch (postErr) {
          console.error('Error posting GLB model to server:', postErr);
          setCustomModelStatus('مدل به صورت محلی فعال شد، اما امکان ذخیره‌سازی ابری وجود ندارد.');
        }
      };
      reader.readAsDataURL(blob);

      // If Three.js scene is already initialized, hot-swap the boss mesh immediately
      applyBossModelToScene(customStructure);
    } catch (err: any) {
      console.error('Error loading custom GLB model:', err);
      setCustomModelStatus('خطا در خواندن فایل GLB! لطفا یک فایل ۳بعدی استاندارد انتخاب کنید.');
    }
  };

  // Mobile virtual joystick & touch states
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);
  const joystickPointerIdRef = useRef<number | null>(null);
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const [showOnScreenControls, setShowOnScreenControls] = useState(true);

  const lookPointerIdRef = useRef<number | null>(null);
  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLookDraggingRef = useRef<boolean>(false);

  // Ref states for Three.js render loop
  const upgradesRef = useRef(upgrades);
  upgradesRef.current = upgrades;

  const isAutoFireRef = useRef(isAutoFire);
  isAutoFireRef.current = isAutoFire;

  const isBossDefeatedRef = useRef(isBossDefeated);
  isBossDefeatedRef.current = isBossDefeated;

  const hasShownRageMessageRef = useRef(false);

  // Countdown and Pausing optimization refs
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  countdownRef.current = countdown;

  const isShopOpenRef = useRef(isShopOpen);
  isShopOpenRef.current = isShopOpen;

  const isNearMoonRef = useRef(isNearMoon);
  isNearMoonRef.current = isNearMoon;

  const isMoonLetterOpenRef = useRef(isMoonLetterOpen);
  isMoonLetterOpenRef.current = isMoonLetterOpen;

  const showVictoryCelebrationRef = useRef(showVictoryCelebration);
  showVictoryCelebrationRef.current = showVictoryCelebration;

  const isBossActiveRef = useRef(isBossActive);
  isBossActiveRef.current = isBossActive;

  const controlModeRef = useRef(controlMode);
  controlModeRef.current = controlMode;

  // UI Throttling refs to avoid React re-rendering every frame
  const lastPlayerHpRef = useRef<number>(-1);
  const lastBossHpRef = useRef<number>(-1);
  const lastIsTargetLockedRef = useRef<boolean>(false);

  const prevShopOpen = useRef(isShopOpen);
  useEffect(() => {
    if (prevShopOpen.current && !isShopOpen) {
      // Shop was closed, start 3-second countdown!
      setCountdown(3);
      celestialAudio.playStarTwinkle(); // Play a nice start sound
      
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    prevShopOpen.current = isShopOpen;
  }, [isShopOpen]);

  const threeStateRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    animationFrameId: number;
    clock: THREE.Clock;
    starMeshes: { star: GameStar; mesh: THREE.Group; billboard: THREE.Mesh }[];
    moonMesh: THREE.Mesh;
    moonGlowMesh: THREE.Mesh;
    moonShieldMesh: THREE.Mesh;
    moonLetterMesh: THREE.Mesh;
    particleSystem: THREE.Points;
    nebulaGroup: THREE.Group;
    shootingStars: { mesh: THREE.Line; velocity: THREE.Vector3; life: number }[];
    // Combat elements
    bossGroup: THREE.Group;
    bossShieldMesh: THREE.Mesh;
    bossThrusters: THREE.Mesh[];
    bossRings: THREE.Group;
    bossCannons: THREE.Object3D[];
    bossModelData: BossModelStructure;
    bossHealth: number;
    bossState: 'idle' | 'patrol' | 'combat' | 'dodge' | 'dead';
    bossVelocity: THREE.Vector3;
    bossTargetPos: THREE.Vector3;
    bossShootTimer: number;
    bossDodgeTimer: number;
    projectiles: Projectile[];
    lastPlayerShootTime: number;
    playerHealth: number;
    playerMaxHealth: number;
    timeSincePlayerDamage: number;
    invincibilityTimer: number;
    // Camera & player physics
    yaw: number;
    pitch: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    keys: { [key: string]: boolean };
    joystickVector: THREE.Vector2;
    touchAltitude: number; // -1: Down, 1: Up, 0: None
    activeAudioStarId: string | null;
  } | null>(null);

  // Detect device default mode
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    if (isTouch || isSmallScreen) {
      setControlMode('mobile');
    } else {
      setControlMode('desktop');
    }
  }, []);

  // Load saved boss model from server on mount & subscribe to real-time changes
  useEffect(() => {
    let isMounted = true;
    const loadSavedModel = async () => {
      try {
        const saved = await loadSavedHostBossModel();
        if (saved && isMounted) {
          customModelDataRef.current = saved;
          setCustomModelFileName('مدل سه بعدی اختصاصی ذخیره شده');
          setCustomModelStatus('سفینه اختصاصی با موفقیت از هاست بارگذاری شد ✅');
          if (threeStateRef.current) {
            applyBossModelToScene(saved);
          }
        }
      } catch (err) {
        console.error('Failed to load saved host boss model:', err);
      }
    };
    loadSavedModel();

    // Subscribe to Firestore for real-time model changes from other devices (e.g. Windows -> Mobile)
    const unsubscribe = subscribeBossModel(async (data) => {
      if (!isMounted) return;
      if (data && data.hasCustomModel) {
        try {
          const reloaded = await loadSavedHostBossModel();
          if (reloaded && isMounted) {
            customModelDataRef.current = reloaded;
            setCustomModelFileName(data.fileName || 'مدل سفینه اختصاصی همگام‌شده');
            setCustomModelStatus('مدل سه بعدی اختصاصی همگام شد! ✅🛸');
            if (threeStateRef.current) {
              applyBossModelToScene(reloaded);
            }
          }
        } catch (syncErr) {
          console.warn('Realtime boss model sync error:', syncErr);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [applyBossModelToScene]);

  // Update player max health when upgrade changes
  useEffect(() => {
    const tier = UPGRADE_CONFIG.maxHealth[upgrades.maxHealthLevel - 1];
    if (tier) {
      setPlayerMaxHealth(tier.value);
      if (threeStateRef.current) {
        threeStateRef.current.playerMaxHealth = tier.value;
        threeStateRef.current.playerHealth = Math.min(threeStateRef.current.playerHealth + 50, tier.value);
        setPlayerHealth(threeStateRef.current.playerHealth);
      }
    }
  }, [upgrades.maxHealthLevel]);

  // Release pointer lock whenever an interactive modal or shop opens
  useEffect(() => {
    if (isShopOpen || isMoonLetterOpen || showVictoryCelebration) {
      if (document.pointerLockElement) {
        try {
          document.exitPointerLock();
        } catch {
          // Ignore
        }
      }
    }
  }, [isShopOpen, isMoonLetterOpen, showVictoryCelebration]);

  // Cleanups on modal close
  useEffect(() => {
    if (!isOpen) {
      setHasStarted(false);
      celestialAudio.dispose();
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }, [isOpen]);

  // Handle start journey
  const handleStartGame = () => {
    setHasStarted(true);
    celestialAudio.init(GAME_CONFIG.audio.ambientMusicUrl);

    // Mobile Optimization: Enter Fullscreen & Request Landscape orientation
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch || controlMode === 'mobile') {
      const el = document.documentElement;
      if (el && el.requestFullscreen) {
        el.requestFullscreen().catch((err) => {
          console.log("Fullscreen request failed:", err);
        });
      }
      if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
        (window.screen.orientation as any).lock('landscape').catch((err: any) => {
          console.log("Orientation lock failed:", err);
        });
      }
    }

    const preset = DIFFICULTY_PRESETS[difficulty];

    if (difficulty === 'peaceful') {
      isBossDefeatedRef.current = true;
      setIsBossDefeated(true);
      setIsBossActive(false);
      setBossHealth(0);
      setBossMaxHealth(0);
      setHintText(GAME_CONFIG.hints.nearMoonPeaceful);

      if (threeStateRef.current) {
        threeStateRef.current.bossState = 'dead';
        threeStateRef.current.bossGroup.visible = false;
        if (threeStateRef.current.moonShieldMesh) {
          threeStateRef.current.moonShieldMesh.visible = false;
        }
      }
    } else {
      isBossDefeatedRef.current = false;
      setIsBossDefeated(false);
      setIsBossActive(false);
      setBossHealth(preset.bossHealth);
      setBossMaxHealth(preset.bossHealth);
      setHintText(GAME_CONFIG.hints.explore);
      hasShownRageMessageRef.current = false;

      if (threeStateRef.current) {
        threeStateRef.current.bossHealth = preset.bossHealth;
        threeStateRef.current.bossState = 'idle';
        threeStateRef.current.bossGroup.visible = true;
        if (threeStateRef.current.moonShieldMesh) {
          threeStateRef.current.moonShieldMesh.visible = true;
        }
      }
    }

    // Request pointer lock only in desktop mode
    if (controlMode === 'desktop' && mountRef.current) {
      try {
        mountRef.current.requestPointerLock();
      } catch {
        // Ignore
      }
    }
  };

  // Toggle audio
  const handleToggleAudio = () => {
    const isNowActive = celestialAudio.toggleMute();
    setIsAudioMuted(!isNowActive);
  };

  // Reward coins helper (Guaranteed single execution per call)
  const addCoins = useCallback((amount: number, text: string) => {
    setCoins((prev) => prev + amount);
    celestialAudio.playCoinSound();
    setCoinNotification({ amount, text, id: Date.now() });
    setTimeout(() => {
      setCoinNotification(null);
    }, 2800);
  }, []);

  // Coins ref to ensure instant sync in event handlers
  const coinsRef = useRef(coins);
  coinsRef.current = coins;

  // Upgrades purchase handler (Correctly maps state keys to UPGRADE_CONFIG categories)
  const handlePurchaseUpgrade = (type: keyof PlayerUpgradesState) => {
    const configKeyMap: Record<keyof PlayerUpgradesState, keyof typeof UPGRADE_CONFIG> = {
      bulletSpeedLevel: 'bulletSpeed',
      bulletDamageLevel: 'bulletDamage',
      fireRateLevel: 'fireRate',
      maxHealthLevel: 'maxHealth',
      magnetLevel: 'magnet',
      engineSpeedLevel: 'engineSpeed',
    };

    const configKey = configKeyMap[type];
    const currentLevel = upgrades[type];
    const tiers = UPGRADE_CONFIG[configKey];
    if (!tiers || currentLevel >= tiers.length) return;

    const nextTierIndex = currentLevel; // Current level is 1-based, next tier is at index currentLevel
    if (nextTierIndex >= tiers.length) return;

    const nextTier = tiers[nextTierIndex];
    if (coinsRef.current < nextTier.cost) {
      return;
    }

    // Deduct coins & increment upgrade level
    const newCoins = coinsRef.current - nextTier.cost;
    coinsRef.current = newCoins;
    setCoins(newCoins);

    const nextUpgrades = {
      ...upgrades,
      [type]: currentLevel + 1,
    };
    upgradesRef.current = nextUpgrades;
    setUpgrades(nextUpgrades);

    // Apply immediate maxHealth boost if upgrading max health
    if (type === 'maxHealthLevel' && threeStateRef.current) {
      threeStateRef.current.playerMaxHealth = nextTier.value;
      threeStateRef.current.playerHealth = Math.min(threeStateRef.current.playerHealth + 60, nextTier.value);
      setPlayerHealth(Math.round(threeStateRef.current.playerHealth));
      setPlayerMaxHealth(nextTier.value);
    }

    celestialAudio.playUpgradeSound();
    setCoinNotification({
      amount: -nextTier.cost,
      text: `ارتقا با موفقیت انجام شد: ${nextTier.label} ✨`,
      id: Date.now(),
    });
    setTimeout(() => {
      setCoinNotification(null);
    }, 2500);
  };

  // Shared textures & geometry caches
  const sharedGlowTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const sharedMoonTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const sharedMoonLetterTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const shared3DStarGeoRef = useRef<THREE.ExtrudeGeometry | null>(null);
  const sharedCardTextureCacheRef = useRef<Map<string, THREE.CanvasTexture>>(new Map());

  // Realistic Star texture
  const getOrCreateRealisticStarTexture = useCallback(() => {
    if (sharedGlowTextureRef.current) return sharedGlowTextureRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);

      const haloGrad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      haloGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      haloGrad.addColorStop(0.12, 'rgba(255, 255, 255, 0.9)');
      haloGrad.addColorStop(0.28, 'rgba(240, 248, 255, 0.45)');
      haloGrad.addColorStop(0.6, 'rgba(224, 242, 254, 0.15)');
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, 0, 128, 128);

      const hGrad = ctx.createLinearGradient(0, 64, 128, 64);
      hGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      hGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.8)');
      hGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      hGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.8)');
      hGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.moveTo(0, 64);
      ctx.lineTo(64, 61);
      ctx.lineTo(128, 64);
      ctx.lineTo(64, 67);
      ctx.closePath();
      ctx.fill();

      const vGrad = ctx.createLinearGradient(64, 0, 64, 128);
      vGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      vGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.8)');
      vGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      vGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.8)');
      vGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = vGrad;
      ctx.beginPath();
      ctx.moveTo(64, 0);
      ctx.lineTo(61, 64);
      ctx.lineTo(64, 128);
      ctx.lineTo(67, 64);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(64, 64, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    sharedGlowTextureRef.current = texture;
    return texture;
  }, []);

  // Moon Texture
  const getOrCreateMoonTexture = useCallback(() => {
    if (sharedMoonTextureRef.current) return sharedMoonTextureRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 25, 128, 128, 128);
      grad.addColorStop(0, '#fffaee');
      grad.addColorStop(0.7, '#fce7cb');
      grad.addColorStop(1, '#e5c4a5');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = 'rgba(210, 175, 150, 0.25)';
      const craters = [
        { x: 90, y: 80, r: 25 },
        { x: 150, y: 110, r: 35 },
        { x: 110, y: 160, r: 30 },
        { x: 180, y: 170, r: 20 },
      ];
      craters.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    const texture = new THREE.CanvasTexture(canvas);
    sharedMoonTextureRef.current = texture;
    return texture;
  }, []);

  // 3D Spherical Moon Letter Ink Overlay Texture
  const getOrCreateMoonLetterTexture = useCallback(() => {
    if (sharedMoonLetterTextureRef.current) return sharedMoonLetterTextureRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Completely transparent background so text appears directly written on the moon surface!
      ctx.clearRect(0, 0, 2400, 1200);

      // Header Title - Clean Deep Black Ink (No outlines/borders)
      ctx.textAlign = 'center';
      ctx.font = 'bold 54px "Vazirmatn", "Tahoma", sans-serif';
      ctx.fillStyle = '#0a020d';
      ctx.fillText('💌 ' + GAME_CONFIG.moon.letter.title, 1200, 150);

      // Date
      ctx.font = 'bold 34px "Vazirmatn", "Tahoma", sans-serif';
      ctx.fillStyle = '#1c0422';
      ctx.fillText(GAME_CONFIG.moon.letter.date, 1200, 212);

      // Divider Line in Dark Violet-Black
      ctx.beginPath();
      ctx.moveTo(320, 248);
      ctx.lineTo(2080, 248);
      ctx.strokeStyle = '#18031e';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Body Text - Clean Deep Black Ink (No outlines/borders)
      ctx.font = 'bold 31px "Vazirmatn", "Tahoma", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#060108';

      const fullContent = GAME_CONFIG.moon.letter.content;
      const paragraphs = fullContent.split('\n');
      let y = 315;
      const maxWidth = 1720;
      const xRight = 2060;

      for (const paragraph of paragraphs) {
        if (y > 1050) break;
        if (!paragraph.trim()) {
          y += 20;
          continue;
        }

        const words = paragraph.split(' ');
        let currentLine = '';

        for (let n = 0; n < words.length; n++) {
          const testLine = currentLine ? currentLine + ' ' + words[n] : words[n];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(currentLine, xRight, y);

            currentLine = words[n];
            y += 48;
            if (y > 1050) break;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine && y <= 1050) {
          ctx.fillText(currentLine, xRight, y);
          y += 50;
        }
      }

      // Signature - Deep Dark Rose Ink
      ctx.font = 'bold 38px "Vazirmatn", "Tahoma", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#2d031c';
      ctx.fillText(GAME_CONFIG.moon.letter.signature, 340, 1125);
    }
    const texture = new THREE.CanvasTexture(canvas);
    sharedMoonLetterTextureRef.current = texture;
    return texture;
  }, []);

  // 3D 5-Pointed Star Geometry
  const getOrCreate3DStarGeometry = useCallback(() => {
    if (shared3DStarGeoRef.current) return shared3DStarGeoRef.current;
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 1.1;
    const innerRadius = 0.5;

    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.35,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.14,
      bevelThickness: 0.16,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    shared3DStarGeoRef.current = geo;
    return geo;
  }, []);

  // Floating 3D Text Card Texture for each Star
  const getOrCreateStarFloatingTextTexture = useCallback((star: GameStar) => {
    if (sharedCardTextureCacheRef.current.has(star.id)) {
      return sharedCardTextureCacheRef.current.get(star.id)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Completely transparent background
      ctx.clearRect(0, 0, 512, 256);

      // We only draw the text, no background card!
      
      // Title (Optional, maybe smaller now)
      ctx.font = 'bold 24px Vazirmatn, Tahoma, Arial';
      ctx.fillStyle = '#fde047'; // Yellow-300
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(star.title, 256, 40);

      // Message Text
      ctx.font = '20px Vazirmatn, Tahoma, Arial';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 6;
      
      const words = star.message.replace(/[«»]/g, '').split(' ');
      let line = '';
      let lineY = 85;
      const maxWidth = 480;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 256, lineY);
          line = words[n] + ' ';
          lineY += 32;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 256, lineY);
    }

    const texture = new THREE.CanvasTexture(canvas);
    sharedCardTextureCacheRef.current.set(star.id, texture);
    return texture;
  }, []);

  // Fire Player Laser Function
  const handlePlayerShoot = useCallback(() => {
    const state = threeStateRef.current;
    if (!state || !hasStarted) return;

    const currentUpgrades = upgradesRef.current;
    const fireRateTier = UPGRADE_CONFIG.fireRate[currentUpgrades.fireRateLevel - 1];
    const bulletSpeedTier = UPGRADE_CONFIG.bulletSpeed[currentUpgrades.bulletSpeedLevel - 1];
    const damageTier = UPGRADE_CONFIG.bulletDamage[currentUpgrades.bulletDamageLevel - 1];

    const cooldown = fireRateTier ? fireRateTier.value : 0.35;
    const speed = bulletSpeedTier ? bulletSpeedTier.value : 90;
    const damage = damageTier ? damageTier.value : 15;

    const now = state.clock.getElapsedTime();
    if (now - state.lastPlayerShootTime < cooldown) return;
    state.lastPlayerShootTime = now;

    // Get shooting direction from camera
    _tempVec3_1.set(0, 0, -1).applyQuaternion(state.camera.quaternion).normalize();

    // Laser bolt mesh with shared geometry & material (zero GC)
    const laserMesh = new THREE.Mesh(sharedPlayerLaserGeo, sharedPlayerLaserMat);

    // Position at the player ship's physical nose tip
    _tempVec3_2.set(0, -1, 0).applyQuaternion(state.camera.quaternion).normalize();
    _tempVec3_3.copy(state.camera.position)
      .addScaledVector(_tempVec3_1, 5.2)
      .addScaledVector(_tempVec3_2, 0.9);

    laserMesh.position.copy(_tempVec3_3);
    laserMesh.quaternion.copy(state.camera.quaternion);

    state.scene.add(laserMesh);

    state.projectiles.push({
      mesh: laserMesh,
      velocity: _tempVec3_1.clone().multiplyScalar(speed),
      life: 2.2, // seconds
      damage,
      isPlayer: true,
    });

    celestialAudio.playPlayerLaser();
  }, [hasStarted]);
  
  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a030c, 0.0022);

    // Mobile performance detection
    const isMobileDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.5, 900);
    camera.position.set(0, 10, 20);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobileDevice, // MSAA disabled on mobile GPUs gives massive 2x FPS boost!
      alpha: false,
      powerPreference: 'high-performance',
      precision: isMobileDevice ? 'mediump' : 'highp',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isMobileDevice ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 2.0));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setClearColor(0x0a030c, 1.0);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Comprehensive Ambient & Directional Lighting for 3D Models
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.9);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfff5f8, 0x221828, 1.6);
    scene.add(hemiLight);

    // Key front light shining towards the galaxy center and boss
    const keyDirLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyDirLight.position.set(30, 80, 60);
    scene.add(keyDirLight);

    // Fill light from upper front
    const fillLight = new THREE.DirectionalLight(0xffe6f0, 1.8);
    fillLight.position.set(-40, 50, 40);
    scene.add(fillLight);

    const moonLight = new THREE.PointLight(0xfff0dd, 3.0, 450);
    moonLight.position.set(...GAME_CONFIG.moon.position);
    scene.add(moonLight);

    // 3. Skybox Star Particles
    const starCount = isMobileDevice ? 1600 : 3200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 280 + Math.random() * 250;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      starColors[i * 3] = 0.9 + Math.random() * 0.1;
      starColors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
      starColors[i * 3 + 2] = 0.95 + Math.random() * 0.05;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const particleSystem = new THREE.Points(starGeo, starMat);
    scene.add(particleSystem);

    // 4. Cosmic Nebula Clouds (Cleared/Removed as requested to keep the sky crystal clear)
    const nebulaGroup = new THREE.Group();
    // scene.add(nebulaGroup);

    // 5. The Grand Luminous Moon
    const moonSegs = isMobileDevice ? 20 : 28;
    const moonGeo = new THREE.SphereGeometry(GAME_CONFIG.moon.radius, moonSegs, moonSegs);
    const moonMat = new THREE.MeshStandardMaterial({
      map: getOrCreateMoonTexture(),
      roughness: 0.8,
      metalness: 0.1,
      emissive: new THREE.Color(0xffecd6),
      emissiveIntensity: 0.45,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(...GAME_CONFIG.moon.position);
    scene.add(moonMesh);

    // Moon Atmospheric Glow Sprite
    const moonGlowGeo = new THREE.PlaneGeometry(GAME_CONFIG.moon.radius * 3.6, GAME_CONFIG.moon.radius * 3.6);
    const moonGlowMat = new THREE.MeshBasicMaterial({
      map: getOrCreateRealisticStarTexture(),
      color: 0xffdca8,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const moonGlowMesh = new THREE.Mesh(moonGlowGeo, moonGlowMat);
    moonGlowMesh.position.copy(moonMesh.position);
    scene.add(moonGlowMesh);

    // Moon Protective Forcefield Shield (Active before Boss is defeated)
    const shieldSegs = isMobileDevice ? 18 : 28;
    const moonShieldGeo = new THREE.SphereGeometry(GAME_CONFIG.moon.radius * 1.35, shieldSegs, shieldSegs);
    const moonShieldMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const moonShieldMesh = new THREE.Mesh(moonShieldGeo, moonShieldMat);
    moonShieldMesh.position.copy(moonMesh.position);
    scene.add(moonShieldMesh);

    // 5b. Curved 3D Moon Letter Ink Overlay (Inscribed directly onto the Moon's spherical surface)
    const moonLetterTex = getOrCreateMoonLetterTexture();
    const moonLetterGeo = new THREE.SphereGeometry(
      GAME_CONFIG.moon.radius * 1.008,
      64,
      64,
      Math.PI * 0.19, // phiStart (centered at front +Z axis facing player)
      Math.PI * 0.62, // phiLength (~112 deg wide front curvature span)
      Math.PI * 0.08, // thetaStart (near top)
      Math.PI * 0.84  // thetaLength (~150 deg vertical latitude span)
    );
    const moonLetterMat = new THREE.MeshBasicMaterial({
      map: moonLetterTex,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const moonLetterMesh = new THREE.Mesh(moonLetterGeo, moonLetterMat);
    moonLetterMesh.position.copy(moonMesh.position);
    scene.add(moonLetterMesh);

    // 6. Interactive Message Stars (Over 80 Unique Stars)
    const starMeshes: {
      star: GameStar;
      mesh: THREE.Group;
      billboard: THREE.Mesh;
    }[] = [];

    const shared3DStarGeo = getOrCreate3DStarGeometry();
    const sharedBillboardGeo = new THREE.PlaneGeometry(10.5, 5.25);
    const whiteStarMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    GAME_CONFIG.stars.forEach((star) => {
      const starGroup = new THREE.Group();
      starGroup.position.set(...star.position);

      // Clean 3D 5-pointed star without glowing aura/halo
      const starMesh = new THREE.Mesh(shared3DStarGeo, whiteStarMaterial);
      const starScale = (star.size || 2.0) * 1.1;
      starMesh.scale.set(starScale, starScale, starScale);
      starGroup.add(starMesh);

      const textTexture = getOrCreateStarFloatingTextTexture(star);
      const textMat = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const textBillboard = new THREE.Mesh(sharedBillboardGeo, textMat);
      textBillboard.position.set(0, -(starScale * 1.3) - 3.8, 0);
      starGroup.add(textBillboard);

      scene.add(starGroup);
      starMeshes.push({ star, mesh: starGroup, billboard: textBillboard });
    });

    // 7. 3D Boss Spaceship Model (Guard of the Moon)
    const bossModelData = customModelDataRef.current || createBossSpaceshipModel();
    const bossGroup = bossModelData.group;
    // Initial boss position orbiting in front of the moon
    bossGroup.position.set(0, 65, -135);
    scene.add(bossGroup);

    // 8. Shooting Stars System
    const shootingStars: { mesh: THREE.Line; velocity: THREE.Vector3; life: number }[] = [];

    const sharedShootingStarGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -12)]);
    const sharedShootingStarMat = new THREE.LineBasicMaterial({
      color: 0xfff0f5,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    const spawnShootingStar = () => {
      const line = new THREE.Line(sharedShootingStarGeo, sharedShootingStarMat);

      const startX = camera.position.x + (Math.random() - 0.5) * 160;
      const startY = camera.position.y + 40 + Math.random() * 80;
      const startZ = camera.position.z - 80 - Math.random() * 100;

      line.position.set(startX, startY, startZ);
      line.rotation.x = 0.4 + Math.random() * 0.3;
      line.rotation.y = -0.6 + Math.random() * 0.4;

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        -50 - Math.random() * 30,
        50 + Math.random() * 40
      );

      scene.add(line);
      shootingStars.push({ mesh: line, velocity, life: 1.0 });
    };

    // 9. Initialize State Reference
    const clock = new THREE.Clock();
    threeStateRef.current = {
      scene,
      camera,
      renderer,
      animationFrameId: 0,
      clock,
      starMeshes,
      moonMesh,
      moonGlowMesh,
      moonShieldMesh,
      moonLetterMesh,
      particleSystem,
      nebulaGroup,
      shootingStars,
      // Boss state
      bossGroup,
      bossShieldMesh: bossModelData.shieldMesh,
      bossThrusters: bossModelData.thrusterLights,
      bossRings: bossModelData.rotatingRings,
      bossCannons: bossModelData.cannons,
      bossModelData,
      bossHealth: DIFFICULTY_PRESETS[difficultyRef.current].bossHealth,
      bossState: difficultyRef.current === 'peaceful' ? 'dead' : 'idle',
      bossVelocity: new THREE.Vector3(),
      bossTargetPos: new THREE.Vector3(0, 65, -135),
      bossShootTimer: 0,
      bossDodgeTimer: 0,
      projectiles: [],
      lastPlayerShootTime: 0,
      playerHealth: 100,
      playerMaxHealth: 100,
      timeSincePlayerDamage: 0,
      invincibilityTimer: 0,
      // Movement
      yaw: 0,
      pitch: 0,
      position: new THREE.Vector3(0, 10, 15),
      velocity: new THREE.Vector3(),
      keys: {},
      joystickVector: new THREE.Vector2(),
      touchAltitude: 0,
      activeAudioStarId: null,
    };

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (threeStateRef.current) {
        threeStateRef.current.keys[e.code] = true;
        // Space reassigned to altitude UP instead of shooting
        if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          e.preventDefault();
        }
        if (e.code === 'KeyB') {
          e.preventDefault();
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          setIsShopOpen(prev => !prev);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (threeStateRef.current) {
        threeStateRef.current.keys[e.code] = false;
      }
    };

    // Mouse Move (Pointer Lock)
    const handleMouseMove = (e: MouseEvent) => {
      if (!threeStateRef.current || !document.pointerLockElement) return;

      const sens = GAME_CONFIG.movement.lookSensitivityMouse;
      threeStateRef.current.yaw -= e.movementX * sens;
      threeStateRef.current.pitch -= e.movementY * sens;
      threeStateRef.current.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, threeStateRef.current.pitch));
    };

    const handlePointerLockChange = () => {
      setIsPointerLocked(!!document.pointerLockElement);
    };

    // Mouse click shooting in desktop mode
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && document.pointerLockElement) {
        handlePlayerShoot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // Resize Handler
    const handleResize = () => {
      if (!container || !threeStateRef.current) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let shootingStarTimer = 0;

    // 10. Main Animation & Game Logic Loop
    const animate = () => {
      const state = threeStateRef.current;
      if (!state) return;

      try {
        // Always call getDelta() so that the clock stays up-to-date and doesn't accumulate elapsed time during pause
        const rawDelta = state.clock.getDelta();

        const isPaused = isShopOpenRef.current || countdownRef.current !== null || isMoonLetterOpenRef.current || showVictoryCelebrationRef.current;

        if (isPaused) {
          renderer.render(scene, camera);
          state.animationFrameId = requestAnimationFrame(animate);
          return;
        }

        const delta = Math.min(rawDelta, 0.1);
        const time = state.clock.getElapsedTime();

        // Tick down invincibility timer
        if (state.invincibilityTimer > 0) {
          state.invincibilityTimer = Math.max(0, state.invincibilityTimer - delta);
          if (state.invincibilityTimer <= 0) {
            setIsInvincible(false);
          } else if (!isInvincibleRef.current) {
            setIsInvincible(true);
          }
        } else if (isInvincibleRef.current) {
          setIsInvincible(false);
        }

        // Auto-fire check if enabled
        if (isAutoFireRef.current && state.bossState === 'combat' && !isBossDefeatedRef.current) {
          handlePlayerShoot();
        }

        // Check distance to Moon
        const distToMoon = state.position.distanceTo(state.moonMesh.position);
        const nearMoonNow = distToMoon <= GAME_CONFIG.movement.moonTriggerDistance;

        if (nearMoonNow !== isNearMoonRef.current) {
          isNearMoonRef.current = nearMoonNow;
          setIsNearMoon(nearMoonNow);
          if (nearMoonNow) {
            const isMoonUnlocked = isBossDefeatedRef.current || difficultyRef.current === 'peaceful';
            if (isMoonUnlocked) {
              setHintText(GAME_CONFIG.hints.nearMoonUnlocked);
              // Play moon voice ONLY when moon is unlocked (boss is defeated or peaceful mode)
              celestialAudio.playMoonVoice('https://uploadkon.ir/uploads/e64321_26Recording-7-.m4a');
            } else {
              setHintText(GAME_CONFIG.hints.nearMoonLocked);
              // Moon is closed / locked -> DO NOT PLAY MOON VOICE!
              celestialAudio.stopMoonVoice();
            }
          } else {
            celestialAudio.stopMoonVoice();
            setHintText(isBossDefeatedRef.current ? GAME_CONFIG.hints.explore : (isBossActiveRef.current ? GAME_CONFIG.hints.bossFight : GAME_CONFIG.hints.explore));
          }
        }

      // Smooth flight speed
      const baseMoveSpeed = UPGRADE_CONFIG.engineSpeed[upgradesRef.current.engineSpeedLevel - 1]?.value || GAME_CONFIG.movement.moveSpeed;
      const effectiveSpeed = nearMoonNow
        ? baseMoveSpeed * 0.65
        : baseMoveSpeed;

      // Update Camera Transform based on look angles
      _tempEuler.set(state.pitch, state.yaw, 0, 'YXZ');
      state.camera.quaternion.setFromEuler(_tempEuler);

      // Player Movement Vector Calculation
      _tempVec3_1.set(0, 0, 0);
      const keys = state.keys;

      if (keys['KeyW'] || keys['ArrowUp']) _tempVec3_1.z -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) _tempVec3_1.z += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) _tempVec3_1.x -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) _tempVec3_1.x += 1;

      // Joystick Input
      if (state.joystickVector.lengthSq() > 0.0025) {
        _tempVec3_1.x += state.joystickVector.x;
        _tempVec3_1.z += state.joystickVector.y;
      }

      if (keys['KeyE'] || keys['Space'] || state.touchAltitude === 1) _tempVec3_1.y += 0.8;
      if (keys['KeyQ'] || keys['KeyC'] || keys['ShiftLeft'] || keys['ShiftRight'] || state.touchAltitude === -1) _tempVec3_1.y -= 0.8;

      if (_tempVec3_1.lengthSq() > 0) {
        _tempVec3_1.normalize();
        _tempVec3_2.copy(_tempVec3_1).applyQuaternion(state.camera.quaternion);

        state.velocity.x = _tempVec3_2.x * effectiveSpeed;
        state.velocity.y = _tempVec3_2.y * effectiveSpeed;
        state.velocity.z = _tempVec3_2.z * effectiveSpeed;
      } else {
        state.velocity.multiplyScalar(0.86);
      }

      // Update Player Position
      state.position.addScaledVector(state.velocity, delta);
      state.position.x = Math.max(-280, Math.min(280, state.position.x));
      state.position.y = Math.max(-20, Math.min(320, state.position.y));
      state.position.z = Math.max(-350, Math.min(350, state.position.z));

      state.camera.position.copy(state.position);

      // Moon Billboards & Rotating Protective Shield
      state.moonGlowMesh.lookAt(state.camera.position);
      if (state.moonShieldMesh) {
        state.moonShieldMesh.rotation.y = time * 0.2;
        state.moonShieldMesh.rotation.x = time * 0.1;
        state.moonShieldMesh.visible = !isBossDefeatedRef.current;
      }
      if (state.moonLetterMesh) {
        const isUnlocked = isBossDefeatedRef.current || difficultyRef.current === 'peaceful';
        const distToMoon = state.position.distanceTo(state.moonMesh.position);

        // Hidden from far away; fades in smoothly only when player approaches close to the moon (< 160 units)
        if (isUnlocked && distToMoon < 160) {
          const fade = Math.max(0, Math.min(1.0, (160 - distToMoon) / 90));
          (state.moonLetterMesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.98;
          state.moonLetterMesh.visible = fade > 0.01;
        } else {
          state.moonLetterMesh.visible = false;
        }
      }

      state.particleSystem.rotation.y = time * 0.012;
      state.particleSystem.rotation.x = time * 0.006;

      // Player Shield Auto-Regeneration (if not damaged for 4 seconds)
      state.timeSincePlayerDamage += delta;
      if (state.timeSincePlayerDamage > 4.0 && state.playerHealth < state.playerMaxHealth) {
        state.playerHealth = Math.min(state.playerMaxHealth, state.playerHealth + 18 * delta);
        const roundedPlayerHp = Math.round(state.playerHealth);
        if (roundedPlayerHp !== lastPlayerHpRef.current) {
          lastPlayerHpRef.current = roundedPlayerHp;
          setPlayerHealth(roundedPlayerHp);
        }
      }

      // ==========================================
      // BOSS FIGHT AI & MANEUVERABILITY SYSTEM
      // ==========================================
      const currentDiff = DIFFICULTY_PRESETS[difficultyRef.current];
      const distToBoss = state.position.distanceTo(state.bossGroup.position);
      const isBossAlive = currentDiff.hasBoss && !isBossDefeatedRef.current && state.bossHealth > 0;

      // Lock-on crosshair calculation
      if (isBossAlive) {
        _tempVec3_1.copy(state.bossGroup.position).sub(state.camera.position).normalize();
        _tempVec3_2.set(0, 0, -1).applyQuaternion(state.camera.quaternion).normalize();
        const dot = _tempVec3_2.dot(_tempVec3_1);
        const targetLocked = dot > 0.94;
        if (targetLocked !== lastIsTargetLockedRef.current) {
          lastIsTargetLockedRef.current = targetLocked;
          setIsTargetLocked(targetLocked);
        }
      } else if (lastIsTargetLockedRef.current) {
        lastIsTargetLockedRef.current = false;
        setIsTargetLocked(false);
      }

      if (isBossAlive) {
        // Activate boss if player gets close (<= 95) or hits it
        if (state.bossState === 'idle' && (distToBoss < GAME_CONFIG.boss.detectionRadius || distToMoon < 110)) {
          state.bossState = 'combat';
          setIsBossActive(true);
          setHintText(GAME_CONFIG.hints.bossFight);
          celestialAudio.playBossVoice(GAME_CONFIG.boss.voiceUrl);

          // Safe-push player to tactical distance & face boss
          state.position.set(0, 15, 35);
          state.velocity.set(0, 0, 0);
          state.yaw = 0;
          state.pitch = 0.15; // slightly looking up towards the boss
          state.invincibilityTimer = 4.5; // 4.5 seconds of absolute invincibility shield!
          setIsInvincible(true);
        }

        // Animate Boss Sub-systems (Exhausts & Quantum Core Rings)
        if (state.bossRings) {
          state.bossRings.rotation.z = time * 2.5;
          state.bossRings.rotation.y = time * 1.8;
        }
        if (state.bossThrusters) {
          state.bossThrusters.forEach((thruster) => {
            thruster.scale.set(1, 1, 1 + Math.sin(time * 20) * 0.35);
          });
        }
        if (state.bossShieldMesh) {
          state.bossShieldMesh.rotation.y = -time * 0.8;
          (state.bossShieldMesh.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(time * 5) * 0.08;
        }

        if (state.bossState === 'combat' || state.bossState === 'dodge') {
          // Determine if Boss is in Rage Mode (HP <= 25% of Max health)
          const isRaged = state.bossHealth <= (currentDiff.bossHealth * 0.25);
          if (isRaged && !hasShownRageMessageRef.current) {
            hasShownRageMessageRef.current = true;
            setHintText("⚠️ هشدار! نگهبان ماه غضبناک شد! سرعت و قدرت شلیک دو برابر شد! 💥👹");
          }

          // Look towards player smoothly
          _tempQuat_1.copy(state.bossGroup.quaternion);
          state.bossGroup.lookAt(state.position);
          _tempQuat_2.copy(state.bossGroup.quaternion);
          state.bossGroup.quaternion.copy(_tempQuat_1).slerp(_tempQuat_2, 0.08);

          // Evasive Maneuver / Dodging Mechanics
          state.bossDodgeTimer += delta;
          if (state.bossDodgeTimer > 3.2 + Math.random() * 2.0) {
            state.bossState = 'dodge';
            state.bossDodgeTimer = 0;
            _tempVec3_1.set(
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 1.5,
              (Math.random() - 0.5) * 1.5
            ).normalize();
            state.bossVelocity.copy(_tempVec3_1).multiplyScalar(GAME_CONFIG.boss.dodgeSpeed * (isRaged ? 1.4 : 1.0));
          }

          if (state.bossState === 'dodge') {
            state.bossGroup.rotation.z += delta * 6.0; // Barrel roll effect!
            state.bossGroup.position.addScaledVector(state.bossVelocity, delta);
            state.bossVelocity.multiplyScalar(0.92);
            if (state.bossVelocity.lengthSq() < 9.0) {
              state.bossState = 'combat';
            }
          } else {
            // Tactical Combat Maneuvering: Orbit and follow player maintaining ~45 units
            const desiredDist = GAME_CONFIG.boss.orbitRadius;
            _tempVec3_1.copy(state.position).sub(state.bossGroup.position);
            const currentDist = _tempVec3_1.length();

            _tempVec3_2.set(0, 0, 0);
            if (currentDist > desiredDist + 8) {
              _tempVec3_2.add(_tempVec3_1.normalize());
            } else if (currentDist < desiredDist - 8) {
              _tempVec3_2.add(_tempVec3_1.normalize().negate());
            }

            // Circular orbital drift
            _tempVec3_3.set(-_tempVec3_1.z, 0, _tempVec3_1.x).normalize();
            _tempVec3_2.addScaledVector(_tempVec3_3, 0.6);

            const activeBossSpeed = isRaged ? (currentDiff.bossSpeed * 1.25) : currentDiff.bossSpeed;
            state.bossGroup.position.addScaledVector(_tempVec3_2, activeBossSpeed * delta);
          }

          // Keep Boss in bounds around Moon
          state.bossGroup.position.x = Math.max(-120, Math.min(120, state.bossGroup.position.x));
          state.bossGroup.position.y = Math.max(15, Math.min(110, state.bossGroup.position.y));
          state.bossGroup.position.z = Math.max(-230, Math.min(-60, state.bossGroup.position.z));

          // Force update of sub-meshes' world matrices for extremely precise projectile/wing hit detection
          state.bossGroup.updateMatrixWorld(true);

          // Boss Attack / Shooting System (Linear Plasma Beam from Nose Tip)
          state.bossShootTimer += delta;
          const activeShootCooldown = isRaged ? (currentDiff.bossShootCooldown * 0.65) : currentDiff.bossShootCooldown;
          
          if (state.bossShootTimer > activeShootCooldown) {
            state.bossShootTimer = 0;
            const bulletSpeed = isRaged ? (currentDiff.bossBulletSpeed * 1.55) : (currentDiff.bossBulletSpeed * 1.25);
            const bulletDamage = isRaged ? Math.round(currentDiff.bossDamage * 1.35) : Math.round(currentDiff.bossDamage * 1.15);

            // Firing strictly 1 single beam from center nose tip using shared assets
            const bossForward = _tempVec3_1.set(0, 0, 1).applyQuaternion(state.bossGroup.quaternion).normalize();
            const noseWorldPos = _tempVec3_2.copy(state.bossGroup.position).addScaledVector(bossForward, 11.5);

            // Predict player position
            const distToPlayer = noseWorldPos.distanceTo(state.position);
            const tEst = Math.min(distToPlayer / bulletSpeed, 1.2);
            const predictedPlayerPos = _tempVec3_3.copy(state.position).addScaledVector(state.velocity, tEst);
            const shootDir = predictedPlayerPos.sub(noseWorldPos).normalize();

            // Create a laser spike beam with shared geometry & material (Zero GC)
            const beamMesh = new THREE.Mesh(
              sharedBossBeamGeo,
              isRaged ? sharedBossBeamMatRaged : sharedBossBeamMatNormal
            );
            beamMesh.position.copy(noseWorldPos);

            _tempQuat_1.setFromUnitVectors(_tempVec3_4.set(0, 0, 1), shootDir);
            beamMesh.quaternion.copy(_tempQuat_1);

            state.scene.add(beamMesh);

            state.projectiles.push({
              mesh: beamMesh,
              velocity: shootDir.clone().multiplyScalar(bulletSpeed),
              life: 3.5,
              damage: bulletDamage,
              isPlayer: false,
            });

            celestialAudio.playBossLaser();
          }
        }
      }

      // ==========================================
      // PROJECTILE PHYSICS & COLLISION DETECTION
      // ==========================================
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const proj = state.projectiles[i];

        proj.mesh.position.addScaledVector(proj.velocity, delta);
        proj.life -= delta;

        let hasCollided = false;

        // Player Projectile hitting Boss
        if (proj.isPlayer && isBossAlive) {
          const hitDist = proj.mesh.position.distanceTo(state.bossGroup.position);
          
          // Broad phase distance check: if projectile is within 25 units of boss center
          if (hitDist <= 25.0) {
            let actuallyHit = false;
            const meshes = state.bossModelData?.collidableMeshes;
            
            if (meshes && meshes.length > 0) {
              const tempSphere = new THREE.Sphere();
              const projPos = proj.mesh.position;
              
              for (let j = 0; j < meshes.length; j++) {
                const mesh = meshes[j];
                if (!mesh.geometry.boundingSphere) {
                  mesh.geometry.computeBoundingSphere();
                }
                
                // Copy local bounding sphere and transform to world coordinates
                tempSphere.copy(mesh.geometry.boundingSphere);
                tempSphere.applyMatrix4(mesh.matrixWorld);
                
                // Check if the point is within the bounding sphere
                if (tempSphere.containsPoint(projPos)) {
                  actuallyHit = true;
                  break;
                }
                
                // Fast distance check to the mesh world position (with its bounding sphere radius + tolerance)
                const worldPos = new THREE.Vector3();
                mesh.getWorldPosition(worldPos);
                const distToMesh = projPos.distanceTo(worldPos);
                
                // Get the boss group's scale to scale the local bounding sphere correctly
                const scaleEst = state.bossGroup.scale.x; 
                const hitRadius = (mesh.geometry.boundingSphere.radius * scaleEst) + 1.2;
                if (distToMesh <= hitRadius) {
                  actuallyHit = true;
                  break;
                }
              }
            } else {
              // Fallback to tighter bounding radius of central fuselage
              actuallyHit = (hitDist <= 6.5);
            }

            if (actuallyHit) {
              hasCollided = true;
              state.bossHealth -= proj.damage;
              setBossHealth(Math.max(0, Math.round(state.bossHealth)));
              celestialAudio.playEnemyHit();

              // Flash Boss shield bright cyan/pink
              if (state.bossShieldMesh) {
                (state.bossShieldMesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
              }

              // Boss Defeated!
              if (state.bossHealth <= 0) {
                state.bossState = 'dead';
                setIsBossDefeated(true);
                setIsBossActive(false);
                setShowVictoryCelebration(true);
                setHintText(GAME_CONFIG.hints.bossDefeated);
                celestialAudio.playBossExplosion();

                // Smoothly remove all remaining enemy projectiles from the scene (DO NOT dispose shared geometries/materials!)
                state.projectiles.forEach((p) => {
                  if (!p.isPlayer) {
                    scene.remove(p.mesh);
                  }
                });
                state.projectiles = state.projectiles.filter((p) => p.isPlayer);

                // Hide boss model smoothly
                if (state.bossGroup) {
                  scene.remove(state.bossGroup);
                  state.bossGroup.visible = false;
                }
                // Shatter moon shield
                if (state.moonShieldMesh) {
                  scene.remove(state.moonShieldMesh);
                  state.moonShieldMesh.visible = false;
                }

                // Award Victory Reward
                const reward = currentDiff.bossRewardCoins;
                if (reward > 0) {
                  addCoins(reward, `پیروزی بر نگهبان ماه! +${reward} سکه کیهانی 🎉🪙`);
                }
              }
            }
          }
        }

        // Boss Projectile hitting Player
        if (!proj.isPlayer) {
          const distToPlayer = proj.mesh.position.distanceTo(state.camera.position);
          if (distToPlayer <= 3.2) {
            hasCollided = true;
            
            // Check if player has invincibility shield active
            if (state.invincibilityTimer > 0) {
              // Trigger a nice sound or visual indication that it bounced off if we want, but basically ignore damage
            } else {
              state.playerHealth = Math.max(0, state.playerHealth - proj.damage);
              state.timeSincePlayerDamage = 0;
              setPlayerHealth(Math.round(state.playerHealth));
              celestialAudio.playPlayerHit();
              setIsPlayerHitFlash(true);
              setTimeout(() => setIsPlayerHitFlash(false), 250);

              // Respawn safely if depleted (Friendly & gentle, never harsh)
              if (state.playerHealth <= 0) {
                state.playerHealth = state.playerMaxHealth;
                setPlayerHealth(state.playerMaxHealth);
                state.position.set(0, 15, 45); // Safe recovery point
                state.velocity.set(0, 0, 0);
                state.yaw = 0;
                state.pitch = 0;
                state.invincibilityTimer = 4.0; // 4 seconds shield on respawn
                setIsInvincible(true);

                // Reset Boss Health to max on player death
                state.bossHealth = currentDiff.bossHealth;
                setBossHealth(currentDiff.bossHealth);
                hasShownRageMessageRef.current = false;
                setHintText("نگهبان ماه بازیابی شد! 🔴");
              }
            }
          }
        }

        if (proj.life <= 0 || hasCollided) {
          state.scene.remove(proj.mesh);
          
          // Only dispose custom unique meshes (never shared static projectile meshes!)
          if (proj.mesh.geometry !== sharedPlayerLaserGeo && proj.mesh.geometry !== sharedBossBeamGeo) {
            proj.mesh.traverse((child: any) => {
              if (child.isMesh) {
                child.geometry?.dispose();
                if (Array.isArray(child.material)) {
                  child.material.forEach((m: any) => m?.dispose());
                } else if (child.material) {
                  child.material.dispose();
                }
              }
            });
          }
          
          state.projectiles.splice(i, 1);
        }
      }

      // ==========================================
      // STAR INTERACTION & COIN REWARDS
      // ==========================================
      let closestStar: GameStar | null = null;
      let closestDist = Infinity;

      const magnetTier = UPGRADE_CONFIG.magnet[upgradesRef.current.magnetLevel - 1];
      const triggerDistance = magnetTier ? magnetTier.value : GAME_CONFIG.movement.starTriggerDistance;

      state.starMeshes.forEach(({ star, mesh, billboard }) => {
        const distSq = state.position.distanceToSquared(mesh.position);

        if (mesh.children[0]) {
          mesh.children[0].rotation.y = time * 0.75;
          mesh.children[0].rotation.z = Math.sin(time * 0.6) * 0.2;
        }

        if (distSq < 10000) { // Only calculate lookAt for stars within range (~100 units)
          billboard.lookAt(state.camera.position);

          const dist = Math.sqrt(distSq);
          const textMat = billboard.material as THREE.MeshBasicMaterial;
          if (dist < GAME_CONFIG.movement.starBillboardVisibleDistance) {
            const factor = Math.max(0, 1 - (dist - 8) / (GAME_CONFIG.movement.starBillboardVisibleDistance - 8));
            textMat.opacity = Math.min(1.0, 0.45 + factor * 0.55);
            // Hide 3D text during boss fights for focus
            billboard.visible = !isBossActiveRef.current;
          } else if (dist < 85) {
            textMat.opacity = 0.25;
            billboard.visible = !isBossActiveRef.current;
          } else {
            billboard.visible = false;
          }

          if (dist < closestDist) {
            closestDist = dist;
            if (dist <= triggerDistance) {
              closestStar = star;
            }
          }
        } else {
          billboard.visible = false;
        }

        const isNear = distSq <= triggerDistance * triggerDistance;
        const targetScale = isNear ? 1.4 + Math.sin(time * 6) * 0.12 : 1.0 + Math.sin(time * 2) * 0.05;
        const currentScale = mesh.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
        mesh.scale.setScalar(newScale);
      });

      if (closestStar) {
        if (state.activeAudioStarId !== closestStar.id) {
          celestialAudio.playStarTwinkle();
          state.activeAudioStarId = closestStar.id;

          // Award +30 Coins on discovering a new star (Guaranteed exactly once per unique star)
          if (!discoveredStarIdsRef.current.has(closestStar.id)) {
            discoveredStarIdsRef.current.add(closestStar.id);
            setDiscoveredStarIds(new Set(discoveredStarIdsRef.current));
            addCoins(30, 'کشف پیام ستاره! +۳۰ سکه کیهانی ✨🪙');
          }
        }
        // Star Battle Bypass: During a boss fight, ONLY collect coins/stars and do NOT show the message popup
        if (isBossActiveRef.current) {
          setActiveStar(null);
        } else {
          setActiveStar(closestStar);
        }
      } else {
        setActiveStar(null);
        state.activeAudioStarId = null;
      }

      // Shooting stars
      shootingStarTimer += delta;
      if (shootingStarTimer > 3.5 + Math.random() * 3) {
        spawnShootingStar();
        shootingStarTimer = 0;
      }

      for (let i = state.shootingStars.length - 1; i >= 0; i--) {
        const ss = state.shootingStars[i];
        ss.mesh.position.addScaledVector(ss.velocity, delta);
        ss.life -= delta * 0.8;
        const mat = ss.mesh.material as THREE.LineBasicMaterial;
        mat.opacity = Math.max(0, ss.life);

        if (ss.life <= 0) {
          state.scene.remove(ss.mesh);
          state.shootingStars.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
      } catch (err) {
        console.error("Game loop tick error:", err);
      }
      state.animationFrameId = requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);
    if (threeStateRef.current) {
      threeStateRef.current.animationFrameId = animId;
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (threeStateRef.current?.animationFrameId) cancelAnimationFrame(threeStateRef.current.animationFrameId);

      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('resize', handleResize);

      renderer.dispose();
      starGeo.dispose();
      starMat.dispose();
      moonGeo.dispose();
      moonMat.dispose();
    };
  }, [
    isOpen,
    controlMode,
    getOrCreateRealisticStarTexture,
    getOrCreateMoonTexture,
    getOrCreate3DStarGeometry,
    getOrCreateStarFloatingTextTexture,
    handlePlayerShoot,
    addCoins,
  ]);

  // Touch Virtual Joystick
  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    joystickCenterRef.current = { x: centerX, y: centerY };
    joystickPointerIdRef.current = e.pointerId;
    setIsJoystickActive(true);
    updateJoystick(e.clientX, e.clientY, centerX, centerY);
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isJoystickActive || !joystickCenterRef.current || joystickPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    e.preventDefault();
    updateJoystick(e.clientX, e.clientY, joystickCenterRef.current.x, joystickCenterRef.current.y);
  };

  const handleJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joystickPointerIdRef.current === e.pointerId || isJoystickActive) {
      e.stopPropagation();
      e.preventDefault();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      setIsJoystickActive(false);
      setJoystickPos({ x: 0, y: 0 });
      joystickPointerIdRef.current = null;
      joystickCenterRef.current = null;
      if (threeStateRef.current) {
        threeStateRef.current.joystickVector.set(0, 0);
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number, centerX: number, centerY: number) => {
    const maxRadius = 45;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const joyX = Math.cos(angle) * clampedDist;
    const joyY = Math.sin(angle) * clampedDist;

    setJoystickPos({ x: joyX, y: joyY });

    if (threeStateRef.current) {
      threeStateRef.current.joystickVector.set(joyX / maxRadius, joyY / maxRadius);
    }
  };

  // Universal Multi-Touch Camera Rotation Listener
  useEffect(() => {
    if (!isOpen || !hasStarted) return;

    const handleWindowTouchStart = (e: TouchEvent) => {
      // If desktop pointer locked, ignore
      if (document.pointerLockElement) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const target = touch.target as HTMLElement | null;

        // If touching a button, joystick, or modal overlay, let that control handle it
        if (
          target?.closest('button') ||
          target?.closest('input') ||
          target?.closest('.joystick-zone') ||
          target?.closest('.interactive-control')
        ) {
          continue;
        }

        // If we don't already have an active look touch, assign this finger for camera rotation!
        if (lookTouchIdRef.current === null) {
          lookTouchIdRef.current = touch.identifier;
          lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };
          isLookDraggingRef.current = true;
          break;
        }
      }
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (!isLookDraggingRef.current || lookTouchIdRef.current === null || !lookLastPosRef.current || !threeStateRef.current) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchIdRef.current) {
          const dx = touch.clientX - lookLastPosRef.current.x;
          const dy = touch.clientY - lookLastPosRef.current.y;

          // Responsive sensitivity for smooth 3D camera look on mobile touch screens
          const sens = 0.0058;
          threeStateRef.current.yaw -= dx * sens;
          threeStateRef.current.pitch -= dy * sens;
          threeStateRef.current.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, threeStateRef.current.pitch));

          lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      if (lookTouchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchIdRef.current) {
          lookTouchIdRef.current = null;
          lookLastPosRef.current = null;
          isLookDraggingRef.current = false;
          break;
        }
      }
    };

    window.addEventListener('touchstart', handleWindowTouchStart, { passive: true });
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('touchend', handleWindowTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleWindowTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleWindowTouchStart);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [isOpen, hasStarted]);

  // Touch & Pointer Camera Look Drag Handlers
  const handleLookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPointerLocked) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    lookPointerIdRef.current = e.pointerId;
    lookLastPosRef.current = { x: e.clientX, y: e.clientY };
    isLookDraggingRef.current = true;
  };

  const handleLookPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isLookDraggingRef.current || !lookLastPosRef.current || !threeStateRef.current) return;
    if (lookPointerIdRef.current !== null && lookPointerIdRef.current !== e.pointerId) return;

    const dx = e.clientX - lookLastPosRef.current.x;
    const dy = e.clientY - lookLastPosRef.current.y;

    const sens = controlMode === 'mobile' ? 0.0058 : GAME_CONFIG.movement.lookSensitivityMouse * 1.2;
    threeStateRef.current.yaw -= dx * sens;
    threeStateRef.current.pitch -= dy * sens;
    threeStateRef.current.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, threeStateRef.current.pitch));

    lookLastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleLookPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerIdRef.current === e.pointerId || isLookDraggingRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      isLookDraggingRef.current = false;
      lookPointerIdRef.current = null;
      lookLastPosRef.current = null;
    }
  };

  const handleLookAtMoon = () => {
    if (!threeStateRef.current) return;
    const moonPos = new THREE.Vector3(...GAME_CONFIG.moon.position);
    const dir = moonPos.clone().sub(threeStateRef.current.position).normalize();
    threeStateRef.current.yaw = Math.atan2(-dir.x, -dir.z);
    threeStateRef.current.pitch = Math.asin(dir.y);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#08030b] text-white select-none overflow-hidden touch-none font-vazir">
      {/* Red Hit Flash Effect */}
      {isPlayerHitFlash && (
        <div className="absolute inset-0 z-40 bg-rose-600/30 pointer-events-none transition-opacity duration-150" />
      )}

      {/* 3D WebGL Canvas Mount */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-crosshair"
        onClick={() => {
          if (hasStarted && controlMode === 'desktop' && mountRef.current && !document.pointerLockElement) {
            try {
              const promise = mountRef.current.requestPointerLock() as any;
              if (promise && typeof promise.catch === 'function') {
                promise.catch((err: any) => {
                  console.warn("Pointer lock request rate-limited or denied:", err);
                });
              }
            } catch (err) {
              // Ignore
            }
          }
        }}
      />

      {/* START SCREEN OVERLAY WITH CONTROL SWITCHER & DIFFICULTY */}
      <AnimatePresence>
        {!hasStarted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto overflow-x-hidden touch-auto pointer-events-auto"
          >
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border border-rose-900/70 bg-[#140612]/95 shadow-[0_0_60px_rgba(225,29,72,0.35)] text-center my-auto overflow-hidden">
              {/* Header: Title & Icon (Fixed at top) */}
              <div className="pt-5 pb-3 px-5 sm:px-6 border-b border-rose-900/40 bg-gradient-to-b from-rose-950/30 to-transparent flex flex-col items-center shrink-0">
                <div className="relative mb-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-rose-950 via-pink-900 to-amber-900/40 border border-rose-500/50 flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.4)]">
                    <MoonIcon className="w-7 h-7 sm:w-8 sm:h-8 text-amber-200 fill-amber-200/40 animate-pulse" />
                  </div>
                  <Sparkles className="absolute -top-1.5 -right-1.5 w-5 h-5 text-pink-300 animate-spin" style={{ animationDuration: '6s' }} />
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-pink-300 to-rose-400 mb-1">
                  {GAME_CONFIG.startScreen.title}
                </h1>

                <p className="text-xs text-rose-200/80 font-medium">
                  {GAME_CONFIG.startScreen.subtitle}
                </p>
              </div>

              {/* Scrollable Middle Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3.5 space-y-3.5 custom-scrollbar touch-auto text-right">
                {/* Story Backstory Box */}
                <div className="w-full p-3.5 rounded-2xl bg-gradient-to-b from-rose-950/40 via-purple-950/30 to-black/60 border border-rose-800/60 shadow-[0_0_20px_rgba(225,29,72,0.15)]">
                  <div className="flex items-center justify-between mb-1.5 border-b border-rose-900/40 pb-1.5">
                    <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '8s' }} />
                      <span>داستان سفر نیوشا به کهکشان</span>
                    </span>
                    <span className="text-[10px] text-rose-300/80 font-mono">ماموریت نجات ماه</span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed text-justify font-vazir">
                    {GAME_CONFIG.startScreen.story}
                  </p>
                </div>

                {/* CONTROL MODE SELECTOR */}
                <div className="w-full p-3 rounded-2xl bg-black/60 border border-rose-900/80">
                  <span className="text-[11px] text-rose-300 font-bold block mb-2">🎮 انتخاب شیوه کنترل بازی:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setControlMode('desktop')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        controlMode === 'desktop'
                          ? 'bg-rose-600/90 border-rose-400 text-white shadow-[0_0_15px_rgba(225,29,72,0.5)]'
                          : 'bg-black/50 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Laptop className="w-4 h-4" />
                      <span>مخصوص کامپیوتر (ویندوز)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setControlMode('mobile')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        controlMode === 'mobile'
                          ? 'bg-rose-600/90 border-rose-400 text-white shadow-[0_0_15px_rgba(225,29,72,0.5)]'
                          : 'bg-black/50 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>مخصوص موبایل و لمسی</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-neutral-300 mt-2 leading-relaxed">
                    {controlMode === 'desktop' ? GAME_CONFIG.startScreen.controlsHintDesktop : GAME_CONFIG.startScreen.controlsHintMobile}
                  </p>
                </div>

                {/* DIFFICULTY / GAME MODE SELECTOR */}
                <div className="w-full p-3 rounded-2xl bg-black/60 border border-rose-900/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-rose-300 font-bold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>سطح دشواری و حالت بازی:</span>
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold">
                      {DIFFICULTY_PRESETS[difficulty].badge}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(['peaceful', 'easy', 'normal', 'hard'] as GameDifficulty[]).map((diffKey) => {
                      const preset = DIFFICULTY_PRESETS[diffKey];
                      const isSelected = difficulty === diffKey;
                      return (
                        <button
                          key={diffKey}
                          type="button"
                          onClick={() => {
                            setDifficulty(diffKey);
                            difficultyRef.current = diffKey;
                            setBossMaxHealth(preset.bossHealth);
                            setBossHealth(preset.bossHealth);
                          }}
                          className={`flex flex-col items-start p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-rose-600/90 border-rose-300 text-white shadow-[0_0_15px_rgba(225,29,72,0.6)] scale-[1.02]'
                              : 'bg-black/50 border-neutral-800 text-neutral-300 hover:border-rose-900/60 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold">{preset.name}</span>
                          <span className="text-[10px] opacity-80 mt-0.5">{preset.badge}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 p-2 rounded-xl bg-rose-950/40 border border-rose-900/40 text-[11px] text-rose-200/90 text-right leading-relaxed font-vazir">
                    {DIFFICULTY_PRESETS[difficulty].description}
                  </div>
                </div>

                {/* CUSTOM GLB 3D BOSS MODEL UPLOADER */}
                <div className="w-full p-3 rounded-2xl bg-gradient-to-r from-purple-950/40 via-black/70 to-rose-950/40 border border-purple-800/60 text-right">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-purple-300 font-bold flex items-center gap-1.5 font-vazir">
                      <FileCode className="w-3.5 h-3.5 text-pink-400" />
                      <span>سفینه نگهبان کهکشان (GLB):</span>
                    </span>
                    {customModelFileName && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>فعال شد</span>
                      </span>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".glb,.gltf"
                    onChange={handleGLBUpload}
                    className="hidden"
                  />

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/50 text-purple-200 text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.25)] active:scale-[0.98] font-vazir"
                    >
                      <Upload className="w-4 h-4 text-purple-300" />
                      <span>{customModelFileName ? 'تغییر فایل سفینه (.glb)' : 'آپلود مدل اختصاصی (.glb)'}</span>
                    </button>

                    {customModelFileName && (
                      <button
                        type="button"
                        onClick={async () => {
                          customModelDataRef.current = null;
                          setCustomModelFileName(null);
                          setCustomModelStatus('سفینه اختصاصی حذف شد و به حالت پیش‌فرض بازگشت. 🛸');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          
                          // Clear from IndexedDB and localStorage cache
                          removeBossModelFromCache('sky_custom_boss_glb');
                          
                          // Request delete from server host so it clears for everyone
                          try {
                            await fetch('/api/boss-model', { method: 'DELETE' });
                          } catch (err) {
                            console.error('Failed to delete custom model from server:', err);
                          }

                          // Restore default boss
                          if (threeStateRef.current) {
                            const state = threeStateRef.current;
                            const currentPos = state.bossGroup.position.clone();
                            const currentQuat = state.bossGroup.quaternion.clone();
                            state.scene.remove(state.bossGroup);
                            const defaultBoss = createBossSpaceshipModel();
                            defaultBoss.group.position.copy(currentPos);
                            defaultBoss.group.quaternion.copy(currentQuat);
                            state.scene.add(defaultBoss.group);
                            state.bossGroup = defaultBoss.group;
                            state.bossShieldMesh = defaultBoss.shieldMesh;
                            state.bossThrusters = defaultBoss.thrusterLights;
                            state.bossRings = defaultBoss.rotatingRings;
                            state.bossCannons = defaultBoss.cannons;
                          }
                        }}
                        className="py-2 px-3 rounded-xl bg-neutral-900/80 hover:bg-red-950/60 border border-neutral-700 text-neutral-400 hover:text-red-300 text-xs transition-colors cursor-pointer font-vazir"
                      >
                        حذف سفینه اختصاصی
                      </button>
                    )}
                  </div>

                  {customModelFileName && (
                    <div className="mt-2 text-[11px] text-pink-300 truncate font-mono">
                      📁 فایل فعال: {customModelFileName}
                    </div>
                  )}

                  {customModelStatus && (
                    <div className={`mt-1.5 text-[10px] leading-relaxed font-vazir ${customModelStatus.includes('خطا') ? 'text-rose-400 font-bold' : 'text-emerald-300'}`}>
                      {customModelStatus}
                    </div>
                  )}

                  <p className="text-[10px] text-neutral-400 mt-2 leading-relaxed font-vazir">
                    می‌توانید مدل ۳بعدی سفینه اختصاصی خود را با فرمت <code className="text-purple-300">.glb</code> آپلود کنید تا جایگزین سفینه نگهبان ماه شود.
                  </p>
                </div>

                {/* Gameplay mission description */}
                <div className="w-full p-3 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-[11px] text-neutral-300 text-right space-y-1">
                  <p>⭐ <strong>جمع‌آوری سکه:</strong> با نزدیک شدن به هر ستاره پیام عاشقانه بخوانید و سکه بگیرید.</p>
                  <p>🛒 <strong>ارتقای سفینه:</strong> با سکه‌ها قدرت شلیک، سرعت و جان خود را تقویت کنید.</p>
                  <p>⚔️ <strong>شکست نگهبان ماه:</strong> با نابودی ناو جنگی، سپر ماه شکسته و نامه اصلی باز می‌شود!</p>
                </div>
              </div>

              {/* Pinned Sticky Bottom Action Bar with Start Button */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-t from-[#10040f] via-[#140612] to-transparent border-t border-rose-900/50 flex flex-col items-center gap-2 shrink-0 w-full">
                <button
                  id="start-sky-journey-btn"
                  onClick={handleStartGame}
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm sm:text-base shadow-[0_0_30px_rgba(225,29,72,0.6)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Sparkles className="w-5 h-5 text-amber-200" />
                  <span>{GAME_CONFIG.startScreen.startButtonText}</span>
                </button>

                <button
                  onClick={onClose}
                  className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  بازگشت به صفحه ۱۰۰ روزگی
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IN-GAME HUD & OVERLAYS */}
      {hasStarted && (
        <>
          {/* Top Bar: Discovered Stars, Coins, Shop, Controls Toggle, Audio & Exit */}
          <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 z-30 flex items-center justify-between pointer-events-none">
            {/* Left: Star counter & Coins balance */}
            <div className="pointer-events-auto flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-rose-900/60 backdrop-blur-md text-xs text-rose-200">
                <StarIcon className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                <span>
                  {discoveredStarIds.size} از {GAME_CONFIG.stars.length}
                </span>
              </div>

              {/* Coin Counter */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/70 border border-amber-500/70 backdrop-blur-md text-xs text-amber-200 font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                <Coins className="w-3.5 h-3.5 text-yellow-400 animate-bounce" />
                <span>{coins} سکه</span>
              </div>

              {/* Difficulty badge */}
              <div className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/60 border border-rose-900/60 backdrop-blur-md text-[11px] text-rose-200">
                <span>{DIFFICULTY_PRESETS[difficulty].badge}</span>
              </div>

              {/* Upgrade Shop Button */}
              <button
                onClick={() => setIsShopOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-700/80 to-teal-700/80 hover:from-emerald-600 hover:to-teal-600 border border-emerald-400/60 backdrop-blur-md text-xs text-white font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                title="فروشگاه ارتقای تیر و سرعت و جان"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-200" />
                <span>ارتقا</span>
              </button>
            </div>

            {/* Right Tools: Mode Switcher, Audio & Exit */}
            <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
              {/* Quick switch between Desktop/Mobile */}
              <button
                onClick={() => setControlMode(prev => prev === 'desktop' ? 'mobile' : 'desktop')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-rose-800/60 backdrop-blur-md text-xs text-rose-200 cursor-pointer"
                title="تغییر حالت کنترل بین ویندوز و موبایل"
              >
                {controlMode === 'desktop' ? <Laptop className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                <span>{controlMode === 'desktop' ? 'ویندوز' : 'موبایل'}</span>
              </button>

              <button
                onClick={handleToggleAudio}
                className={`p-2 rounded-full border backdrop-blur-md transition-all cursor-pointer ${
                  isAudioMuted
                    ? 'bg-black/50 border-neutral-700 text-neutral-400'
                    : 'bg-rose-950/60 border-rose-500/80 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                }`}
                title={isAudioMuted ? 'روشن کردن موسیقی' : 'بی‌صدا کردن'}
              >
                {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-rose-300" />}
              </button>

              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-black/60 hover:bg-neutral-900 border border-rose-900/60 text-xs text-neutral-300 hover:text-white backdrop-blur-md transition-all cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          </div>

          {/* BOSS HEALTH BAR (Top-Center HUD when active) */}
          <AnimatePresence>
            {isBossActive && !isBossDefeated && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-14 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm sm:max-w-md px-4 pointer-events-none"
              >
                <div className="p-3 rounded-2xl bg-black/80 border border-rose-500/80 shadow-[0_0_25px_rgba(225,29,72,0.4)] backdrop-blur-md text-center">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                      <span>{GAME_CONFIG.boss.name}</span>
                    </span>
                    <span className="text-neutral-300 font-mono text-[11px]">
                      {bossHealth} / {bossMaxHealth} HP
                    </span>
                  </div>

                  {/* HP Progress bar */}
                  <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-rose-950">
                    <motion.div
                      className="h-full bg-gradient-to-r from-rose-600 via-pink-500 to-amber-400 rounded-full"
                      style={{ width: `${bossMaxHealth > 0 ? (bossHealth / bossMaxHealth) * 100 : 0}%` }}
                      transition={{ type: 'spring', damping: 15 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PLAYER HEALTH & SHIELD BAR (Bottom-Right or Top-Left) */}
          <div className="absolute top-14 right-4 z-20 pointer-events-none hidden sm:flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 text-xs text-rose-300 font-bold">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>سپر و جان: {playerHealth} / {playerMaxHealth}</span>
            </div>
            <div className="w-36 h-2 bg-black/70 rounded-full border border-white/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                style={{ width: `${(playerHealth / playerMaxHealth) * 100}%` }}
              />
            </div>
          </div>

          {/* Center Tactical Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center">
            {isTargetLocked ? (
              <div className="w-9 h-9 rounded-full border-2 border-rose-400 animate-ping absolute opacity-70" />
            ) : null}
            <div
              className={`w-5 h-5 border-2 rounded-full transition-colors ${
                isTargetLocked ? 'border-rose-400 bg-rose-500/20' : 'border-rose-300/40'
              } flex items-center justify-center`}
            >
              <div className={`w-1 h-1 rounded-full ${isTargetLocked ? 'bg-rose-400' : 'bg-white/60'}`} />
            </div>
          </div>

          {/* Key B Shop Prompt Helper for Desktop Mode */}
          {controlMode === 'desktop' && isPointerLocked && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-full bg-[#140612]/95 border-2 border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.55)] backdrop-blur-md text-xs text-emerald-200 font-bold pointer-events-none flex items-center gap-2 animate-bounce font-vazir">
              <ShoppingBag className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>کلید [ B ] روی کیبورد: رهاسازی ماوس و ورود به فروشگاه ارتقا 🛒</span>
            </div>
          )}

          {/* Top Banner Hint Toast (Only for critical alerts, hidden during normal explore to keep screen clean) */}
          {hintText && hintText !== GAME_CONFIG.hints.explore && (
            <div className="absolute top-24 sm:top-20 inset-x-0 z-20 flex justify-center pointer-events-none px-4">
              <motion.div
                key={hintText}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="px-4 py-1.5 rounded-full bg-black/70 border border-rose-900/50 text-xs text-rose-200 backdrop-blur-md shadow-lg text-center"
              >
                {hintText}
              </motion.div>
            </div>
          )}

          {/* Read Moon Letter Button */}
          {isNearMoon && (isBossDefeated || difficulty === 'peaceful') && !isMoonLetterOpen && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-2">
              <button
                id="read-moon-letter-btn"
                onClick={() => {
                  setIsMoonLetterOpen(true);
                  // Play/restart moon voice when reading the love letter modal as well
                  celestialAudio.playMoonVoice('https://uploadkon.ir/uploads/e64321_26Recording-7-.m4a');
                }}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:from-amber-400 hover:to-pink-400 text-neutral-950 font-extrabold text-xs sm:text-sm shadow-[0_0_25px_rgba(251,191,36,0.5)] cursor-pointer flex items-center gap-2 animate-bounce font-vazir"
              >
                <Heart className="w-4 h-4 fill-neutral-950 animate-pulse text-neutral-950" />
                <span>💌 خواندن نامه عاشقانه ماه (کلیک کنید)</span>
              </button>
            </div>
          )}

          {/* COIN REWARD NOTIFICATION POPUP */}
          <AnimatePresence>
            {coinNotification && (
              <motion.div
                key={coinNotification.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className="absolute top-36 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-2 rounded-2xl bg-amber-500/90 text-neutral-950 font-bold text-xs shadow-[0_0_25px_rgba(245,158,11,0.7)] backdrop-blur-md flex items-center gap-2"
              >
                <Coins className="w-4 h-4 fill-neutral-950" />
                <span>{coinNotification.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* VICTORY CELEBRATION MODAL WHEN BOSS IS DEFEATED */}
          <AnimatePresence>
            {showVictoryCelebration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ type: 'spring', damping: 18, stiffness: 200 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[88%] max-w-xs sm:max-w-md max-h-[85vh] overflow-y-auto z-50 p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-[#1c0819]/95 via-[#120410]/95 to-black/95 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(251,191,36,0.5)] backdrop-blur-2xl text-center flex flex-col items-center select-none"
              >
                {/* Floating Glow Crown & Moon */}
                <div className="relative mb-2 sm:mb-3">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-rose-400 p-0.5 shadow-[0_0_30px_rgba(251,191,36,0.6)] flex items-center justify-center animate-bounce">
                    <div className="w-full h-full rounded-full bg-[#160613] flex items-center justify-center">
                      <MoonIcon className="w-6 h-6 sm:w-8 sm:h-8 text-amber-300 fill-amber-300 animate-pulse" />
                    </div>
                  </div>
                  <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
                </div>

                <span className="text-[10px] sm:text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-500/50 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full mb-1.5">
                  🎉 نگهبان ماه شکست خورد!
                </span>

                <h2 className="text-base sm:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-200 to-amber-300 mb-1.5">
                  سپر محافظتی ماه باز شد!
                </h2>

                <p className="text-[11px] sm:text-xs text-neutral-200 leading-relaxed text-justify mb-3 font-vazir bg-black/40 p-2.5 sm:p-3 rounded-xl border border-rose-900/40">
                  نیوشای عزیزم، با شجاعت و قدرت خودت نگهبان آکواریوس‌ها رو شکست دادی! اکنون سپر محافظتی ماه برای همیشه شکسته شده و متن نامه مستقیم روی ماه منعکس شد! ✨💖
                </p>

                <div className="w-full">
                  <button
                    onClick={() => setShowVictoryCelebration(false)}
                    className="w-full py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:from-amber-400 hover:to-pink-400 text-neutral-950 font-extrabold text-xs sm:text-sm shadow-[0_0_20px_rgba(251,191,36,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>پرواز آزاد در کهکشان 🚀</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STAR MESSAGE MODAL REMOVED - MESSAGES ARE NOW 3D BILLBOARDS UNDER EACH STAR */}

          {/* MOON LOVE LETTER MODAL */}
          <AnimatePresence>
            {isMoonLetterOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl sm:max-h-[85vh] z-40 bg-[#160613]/95 border-2 border-amber-300/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_70px_rgba(251,191,36,0.3)] backdrop-blur-2xl flex flex-col justify-between overflow-y-auto"
              >
                <button
                  onClick={() => {
                    if (threeStateRef.current) {
                      threeStateRef.current.position.set(0, 10, 15);
                      threeStateRef.current.velocity.set(0, 0, 0);
                      threeStateRef.current.yaw = 0;
                      threeStateRef.current.pitch = 0;
                    }
                    setIsMoonLetterOpen(false);
                  }}
                  className="absolute top-4 left-4 p-2 rounded-full bg-black/60 text-neutral-300 hover:text-white hover:bg-black/80 transition-colors cursor-pointer z-10"
                  title="بستن نامه"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6 relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-200 text-neutral-900 mb-3 shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                    <MoonIcon className="w-7 h-7 fill-neutral-900" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-amber-200 font-vazir mb-1">
                    {GAME_CONFIG.moon.letter.title}
                  </h2>
                  <span className="text-xs text-rose-300/80 font-mono">
                    {GAME_CONFIG.moon.letter.date}
                  </span>
                </div>

                <div className="p-5 sm:p-6 rounded-2xl bg-[#0e030c]/80 border border-rose-900/60 mb-6 text-right">
                  <p className="text-xs sm:text-sm md:text-base text-neutral-200 leading-loose whitespace-pre-line text-justify font-vazir">
                    {GAME_CONFIG.moon.letter.content}
                  </p>

                  <div className="mt-6 pt-4 border-t border-rose-900/40 text-left">
                    <p className="text-sm sm:text-base font-bold text-rose-300 font-script">
                      {GAME_CONFIG.moon.letter.signature}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-amber-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>نگهبان ماه شکست خورد و راز ماه جاودانه شد! 🌙</span>
                  </div>

                  <button
                    onClick={() => {
                      if (threeStateRef.current) {
                        threeStateRef.current.position.set(0, 10, 15);
                        threeStateRef.current.velocity.set(0, 0, 0);
                        threeStateRef.current.yaw = 0;
                        threeStateRef.current.pitch = 0;
                        threeStateRef.current.invincibilityTimer = 4.0; // 4 seconds invincibility shield
                        setIsInvincible(true);
                      }
                      setIsMoonLetterOpen(false);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    بازگشت به مرکز کهکشان (اسپاون خانه) 🚀
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* UPGRADE SHOP MODAL */}
          <AnimatePresence>
            {isShopOpen && (
              <>
                {/* Clickable backdrop overlay to close shop when clicking outside */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsShopOpen(false)}
                  className="fixed inset-0 z-35 bg-black/45 backdrop-blur-sm cursor-pointer"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:max-h-[85vh] z-40 bg-[#140612]/95 border border-emerald-500/70 rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.3)] backdrop-blur-2xl flex flex-col justify-between overflow-y-auto"
                >
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">فروشگاه ارتقای سفینه</h3>
                      <p className="text-[11px] text-neutral-400">تقویت قابلیت‌ها با سکه‌های جمع‌آوری شده</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsShopOpen(false)}
                    className="p-1.5 rounded-full bg-black/60 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Coin balance in shop */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 mb-4 text-xs font-bold text-amber-200">
                  <span>موجودی سکه‌های شما:</span>
                  <span className="flex items-center gap-1 text-sm text-yellow-300">
                    <Coins className="w-4 h-4" />
                    <span>{coins} سکه</span>
                  </span>
                </div>

                {/* Upgrade Items List */}
                <div className="space-y-3 mb-4 text-right">
                  {/* 1. Bullet Speed */}
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                        <Zap className="w-3.5 h-3.5" />
                        <span>سرعت تیر لیزری (سطح {upgrades.bulletSpeedLevel})</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {UPGRADE_CONFIG.bulletSpeed[upgrades.bulletSpeedLevel - 1]?.desc}
                      </p>
                    </div>
                    {upgrades.bulletSpeedLevel < UPGRADE_CONFIG.bulletSpeed.length ? (
                      <button
                        onClick={() => handlePurchaseUpgrade('bulletSpeedLevel')}
                        disabled={coins < UPGRADE_CONFIG.bulletSpeed[upgrades.bulletSpeedLevel].cost}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          coins >= UPGRADE_CONFIG.bulletSpeed[upgrades.bulletSpeedLevel].cost
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3 h-3" />
                        <span>{UPGRADE_CONFIG.bulletSpeed[upgrades.bulletSpeedLevel].cost}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-bold px-2 py-1 bg-emerald-950/60 rounded-lg">حداکثر</span>
                    )}
                  </div>

                  {/* 2. Bullet Damage */}
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                        <Flame className="w-3.5 h-3.5" />
                        <span>قدرت و آسیب لیزر (سطح {upgrades.bulletDamageLevel})</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {UPGRADE_CONFIG.bulletDamage[upgrades.bulletDamageLevel - 1]?.desc}
                      </p>
                    </div>
                    {upgrades.bulletDamageLevel < UPGRADE_CONFIG.bulletDamage.length ? (
                      <button
                        onClick={() => handlePurchaseUpgrade('bulletDamageLevel')}
                        disabled={coins < UPGRADE_CONFIG.bulletDamage[upgrades.bulletDamageLevel].cost}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          coins >= UPGRADE_CONFIG.bulletDamage[upgrades.bulletDamageLevel].cost
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3 h-3" />
                        <span>{UPGRADE_CONFIG.bulletDamage[upgrades.bulletDamageLevel].cost}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-bold px-2 py-1 bg-emerald-950/60 rounded-lg">حداکثر</span>
                    )}
                  </div>

                  {/* 3. Fire Rate */}
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>سرعت شلیک متوالی (سطح {upgrades.fireRateLevel})</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {UPGRADE_CONFIG.fireRate[upgrades.fireRateLevel - 1]?.desc}
                      </p>
                    </div>
                    {upgrades.fireRateLevel < UPGRADE_CONFIG.fireRate.length ? (
                      <button
                        onClick={() => handlePurchaseUpgrade('fireRateLevel')}
                        disabled={coins < UPGRADE_CONFIG.fireRate[upgrades.fireRateLevel].cost}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          coins >= UPGRADE_CONFIG.fireRate[upgrades.fireRateLevel].cost
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3 h-3" />
                        <span>{UPGRADE_CONFIG.fireRate[upgrades.fireRateLevel].cost}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-bold px-2 py-1 bg-emerald-950/60 rounded-lg">حداکثر</span>
                    )}
                  </div>

                  {/* 4. Max Health */}
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                        <Shield className="w-3.5 h-3.5" />
                        <span>حداکثر جان و سپر دفاعی (سطح {upgrades.maxHealthLevel})</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {UPGRADE_CONFIG.maxHealth[upgrades.maxHealthLevel - 1]?.desc}
                      </p>
                    </div>
                    {upgrades.maxHealthLevel < UPGRADE_CONFIG.maxHealth.length ? (
                      <button
                        onClick={() => handlePurchaseUpgrade('maxHealthLevel')}
                        disabled={coins < UPGRADE_CONFIG.maxHealth[upgrades.maxHealthLevel].cost}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          coins >= UPGRADE_CONFIG.maxHealth[upgrades.maxHealthLevel].cost
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3 h-3" />
                        <span>{UPGRADE_CONFIG.maxHealth[upgrades.maxHealthLevel].cost}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-bold px-2 py-1 bg-emerald-950/60 rounded-lg">حداکثر</span>
                    )}
                  </div>

                  {/* 5. Magnet */}
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>مغناطیس جذب ستاره و سکه (سطح {upgrades.magnetLevel})</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {UPGRADE_CONFIG.magnet[upgrades.magnetLevel - 1]?.desc}
                      </p>
                    </div>
                    {upgrades.magnetLevel < UPGRADE_CONFIG.magnet.length ? (
                      <button
                        onClick={() => handlePurchaseUpgrade('magnetLevel')}
                        disabled={coins < UPGRADE_CONFIG.magnet[upgrades.magnetLevel].cost}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          coins >= UPGRADE_CONFIG.magnet[upgrades.magnetLevel].cost
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3 h-3" />
                        <span>{UPGRADE_CONFIG.magnet[upgrades.magnetLevel].cost}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-bold px-2 py-1 bg-emerald-950/60 rounded-lg">حداکثر</span>
                    )}
                  </div>

                  {/* 6. Engine Speed (Speed Boost) */}
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                        <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '12s' }} />
                        <span>سرعت حرکت و موتور سفینه (سطح {upgrades.engineSpeedLevel})</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {UPGRADE_CONFIG.engineSpeed[upgrades.engineSpeedLevel - 1]?.desc}
                      </p>
                    </div>
                    {upgrades.engineSpeedLevel < UPGRADE_CONFIG.engineSpeed.length ? (
                      <button
                        onClick={() => handlePurchaseUpgrade('engineSpeedLevel')}
                        disabled={coins < UPGRADE_CONFIG.engineSpeed[upgrades.engineSpeedLevel].cost}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          coins >= UPGRADE_CONFIG.engineSpeed[upgrades.engineSpeedLevel].cost
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3 h-3" />
                        <span>{UPGRADE_CONFIG.engineSpeed[upgrades.engineSpeedLevel].cost}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-bold px-2 py-1 bg-emerald-950/60 rounded-lg">حداکثر</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setIsShopOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold cursor-pointer"
                >
                  بازگشت به پرواز
                </button>
              </motion.div>
              </>
            )}
          </AnimatePresence>



          {/* FULL SCREEN TOUCH & POINTER LOOK DRAG SURFACE (Underneath HUD controls) */}
          <div
            className="absolute inset-0 z-10 touch-none cursor-grab active:cursor-grabbing pointer-events-auto"
            onPointerDown={handleLookPointerDown}
            onPointerMove={handleLookPointerMove}
            onPointerUp={handleLookPointerUp}
            onPointerCancel={handleLookPointerUp}
          />

          {/* MOBILE CONTROLS & SHOOT BUTTONS */}
          {controlMode === 'mobile' && showOnScreenControls && (
            <>
              {/* Virtual Joystick (Bottom-Left) */}
              <div
                className="joystick-zone interactive-control absolute bottom-6 left-6 z-30 w-32 h-32 rounded-full bg-black/45 border-2 border-rose-800/70 backdrop-blur-md flex items-center justify-center select-none cursor-pointer touch-none shadow-[0_0_20px_rgba(225,29,72,0.25)] pointer-events-auto"
                onPointerDown={handleJoystickPointerDown}
                onPointerMove={handleJoystickPointerMove}
                onPointerUp={handleJoystickPointerUp}
                onPointerCancel={handleJoystickPointerUp}
              >
                <div
                  className={`w-14 h-14 rounded-full bg-gradient-to-tr from-rose-700 via-pink-600 to-rose-400 border-2 border-white/80 shadow-xl pointer-events-none transition-transform duration-75 flex items-center justify-center ${
                    isJoystickActive ? 'scale-110 ring-4 ring-pink-400/40' : ''
                  }`}
                  style={{
                    transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white/70" />
                </div>
                <span className="absolute bottom-2 text-[9px] text-rose-200/80 font-bold pointer-events-none">
                  حرکت
                </span>
              </div>

              {/* Dedicated Controls Area (Bottom-Right) */}
              <div className="interactive-control absolute bottom-6 right-6 z-30 flex flex-col items-center gap-3 pointer-events-auto">
                {!(isBossDefeated || difficulty === 'peaceful') ? (
                  <>
                    {/* Auto-fire toggle */}
                    <button
                      onClick={() => setIsAutoFire(prev => !prev)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                        isAutoFire
                          ? 'bg-amber-600 border-amber-400 text-white shadow-md'
                          : 'bg-black/60 border-neutral-700 text-neutral-400'
                      }`}
                    >
                      {isAutoFire ? 'شلیک خودکار: روشن ⚡' : 'شلیک خودکار: خاموش'}
                    </button>

                    {/* Primary Fire Button */}
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handlePlayerShoot();
                      }}
                      className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 via-red-500 to-pink-500 active:scale-95 border-2 border-white text-white font-bold shadow-[0_0_30px_rgba(225,29,72,0.6)] flex flex-col items-center justify-center gap-0.5 cursor-pointer touch-none"
                    >
                      <Zap className="w-6 h-6 animate-pulse" />
                      <span className="text-xs">شلیک</span>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Altitude Up */}
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (threeStateRef.current) threeStateRef.current.touchAltitude = 1;
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        if (threeStateRef.current) threeStateRef.current.touchAltitude = 0;
                      }}
                      onPointerLeave={(e) => {
                        e.stopPropagation();
                        if (threeStateRef.current) threeStateRef.current.touchAltitude = 0;
                      }}
                      className="w-16 h-16 rounded-2xl bg-emerald-600/80 backdrop-blur-md border-2 border-emerald-400 text-white flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform touch-none cursor-pointer"
                    >
                      <ChevronUp className="w-8 h-8" />
                      <span className="text-[10px] font-bold">بالا</span>
                    </button>

                    {/* Altitude Down */}
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (threeStateRef.current) threeStateRef.current.touchAltitude = -1;
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        if (threeStateRef.current) threeStateRef.current.touchAltitude = 0;
                      }}
                      onPointerLeave={(e) => {
                        e.stopPropagation();
                        if (threeStateRef.current) threeStateRef.current.touchAltitude = 0;
                      }}
                      className="w-16 h-16 rounded-2xl bg-rose-600/80 backdrop-blur-md border-2 border-rose-400 text-white flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform touch-none cursor-pointer"
                    >
                      <ChevronDown className="w-8 h-8" />
                      <span className="text-[10px] font-bold">پایین</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Desktop Controls Quick Reminder */}
          {controlMode === 'desktop' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto px-4 py-2 rounded-2xl bg-black/80 border border-rose-900/60 backdrop-blur-md text-xs text-rose-200 text-center flex flex-col sm:flex-row items-center gap-3">
              {!isPointerLocked ? (
                <span>🖱️ برای قفل ماوس و چرخش دید <strong>روی صفحه کلیک کنید</strong> | شلیک با <strong>کلیک چپ</strong> یا <strong>Space</strong></span>
              ) : (
                <span>🛒 برای آزاد کردن ماوس و ورود به فروشگاه ارتقا، کلید <strong>[ B ]</strong> یا <strong>[ Esc ]</strong> را فشار دهید</span>
              )}
              {isPointerLocked && (
                <button
                  onClick={() => {
                    if (document.pointerLockElement) {
                      document.exitPointerLock();
                    }
                    setIsShopOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] cursor-pointer pointer-events-auto"
                >
                  ورود به فروشگاه 🛒
                </button>
              )}
            </div>
          )}

          {/* 3, 2, 1 Countdown Overlay */}
          <AnimatePresence>
            {countdown !== null && (
              <motion.div
                key={countdown}
                initial={{ opacity: 0, scale: 2.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/45 pointer-events-none select-none font-vazir"
              >
                <div className="text-center">
                  <motion.div 
                    animate={{ y: [20, 0] }}
                    className="text-8xl md:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500 drop-shadow-[0_0_35px_rgba(244,63,94,0.65)] select-none"
                  >
                    {countdown}
                  </motion.div>
                  <div className="text-base sm:text-lg text-rose-200 font-bold mt-4 tracking-wide bg-black/60 px-5 py-2 rounded-full border border-rose-500/30 backdrop-blur-md">
                    آماده‌باش نیوشا جان... 🚀
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Neon Invincibility Shield HUD Overlay */}
          <AnimatePresence>
            {isInvincible && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                exit={{ opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 z-10 pointer-events-none border-[8px] border-cyan-500/20 shadow-[inset_0_0_80px_rgba(6,182,212,0.3)]"
              >
                <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-400/50 backdrop-blur-md text-[11px] sm:text-xs font-bold text-cyan-200 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] font-vazir">
                  <Shield className="w-4 h-4 text-cyan-300 animate-pulse animate-bounce" />
                  <span>سپر محافظتی فعال است (روئین‌تن) 🛡️✨</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};
