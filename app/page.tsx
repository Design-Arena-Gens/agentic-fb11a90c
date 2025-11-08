'use client'

import { useEffect, useRef, useState } from 'react'

interface Fruit {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  type: string
  size: number
  split: boolean
  splitTime: number
  color: string
  emoji: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export default function FruitCuttingASMR() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const fruits: Fruit[] = []
    const particles: Particle[] = []
    const sliceTrail: { x: number; y: number; time: number }[] = []
    let mouseX = 0
    let mouseY = 0
    let prevMouseX = 0
    let prevMouseY = 0
    let lastFruitSpawn = 0
    let combo = 0
    let comboTimer = 0

    const fruitTypes = [
      { emoji: '🍎', color: '#ff3b30', name: 'apple' },
      { emoji: '🍊', color: '#ff9500', name: 'orange' },
      { emoji: '🍋', color: '#ffcc00', name: 'lemon' },
      { emoji: '🍉', color: '#ff375f', name: 'watermelon' },
      { emoji: '🍓', color: '#ff2d55', name: 'strawberry' },
      { emoji: '🍌', color: '#ffff00', name: 'banana' },
      { emoji: '🍑', color: '#ffb3ba', name: 'peach' },
      { emoji: '🥝', color: '#8bc34a', name: 'kiwi' },
    ]

    const playSliceSound = (frequency: number = 800) => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, ctx.currentTime + 0.1)

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.1)
    }

    const spawnFruit = () => {
      const fruitType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)]
      const size = 40 + Math.random() * 30
      const x = Math.random() * (canvas.width - size * 2) + size
      const y = canvas.height + size

      fruits.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: -12 - Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        type: fruitType.name,
        size,
        split: false,
        splitTime: 0,
        color: fruitType.color,
        emoji: fruitType.emoji
      })
    }

    const createParticles = (x: number, y: number, color: string) => {
      for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 * i) / 15
        const speed = 2 + Math.random() * 4
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color
        })
      }
    }

    const checkSlice = (fruit: Fruit) => {
      const dx = mouseX - fruit.x
      const dy = mouseY - fruit.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < fruit.size && !fruit.split) {
        fruit.split = true
        fruit.splitTime = Date.now()
        createParticles(fruit.x, fruit.y, fruit.color)
        playSliceSound(600 + Math.random() * 400)

        combo++
        comboTimer = Date.now()
        setScore(prev => prev + 10 * combo)

        // Create two halves
        fruits.push({
          ...fruit,
          vx: -3 - Math.random() * 2,
          vy: fruit.vy - 2,
          rotationSpeed: -0.3
        })
        fruits.push({
          ...fruit,
          vx: 3 + Math.random() * 2,
          vy: fruit.vy - 2,
          rotationSpeed: 0.3
        })
      }
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(102, 126, 234, 0.3)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const now = Date.now()

      // Spawn fruits
      if (isPlaying && now - lastFruitSpawn > 800) {
        spawnFruit()
        lastFruitSpawn = now
      }

      // Reset combo if timeout
      if (now - comboTimer > 1000) {
        combo = 0
      }

      // Draw slice trail
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      sliceTrail.forEach((point, i) => {
        const age = now - point.time
        if (age < 200) {
          const alpha = 1 - age / 200
          if (i === 0) {
            ctx.moveTo(point.x, point.y)
          } else {
            ctx.lineTo(point.x, point.y)
          }
        }
      })
      ctx.stroke()
      sliceTrail.forEach((point, i) => {
        if (now - point.time > 200) {
          sliceTrail.splice(i, 1)
        }
      })

      // Update and draw fruits
      for (let i = fruits.length - 1; i >= 0; i--) {
        const fruit = fruits[i]

        fruit.vy += 0.5 // gravity
        fruit.x += fruit.vx
        fruit.y += fruit.vy
        fruit.rotation += fruit.rotationSpeed

        // Remove off-screen fruits
        if (fruit.y > canvas.height + 100 || fruit.x < -100 || fruit.x > canvas.width + 100) {
          fruits.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.translate(fruit.x, fruit.y)
        ctx.rotate(fruit.rotation)

        if (fruit.split) {
          const splitAge = now - fruit.splitTime
          ctx.globalAlpha = Math.max(0, 1 - splitAge / 1000)

          // Draw half fruit
          ctx.font = `${fruit.size}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(fruit.emoji, 0, 0)

          // Draw juice drips
          ctx.fillStyle = fruit.color
          for (let j = 0; j < 3; j++) {
            const dripY = (splitAge / 10) * (j + 1)
            ctx.globalAlpha = Math.max(0, 0.5 - splitAge / 1000)
            ctx.fillRect(-5 + j * 5, dripY, 3, 10)
          }

          if (splitAge > 1000) {
            fruits.splice(i, 1)
          }
        } else {
          // Draw whole fruit
          ctx.font = `${fruit.size}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(fruit.emoji, 0, 0)
        }

        ctx.restore()
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i]

        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.2
        particle.life -= 0.02

        if (particle.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.fillStyle = particle.color
        ctx.globalAlpha = particle.life
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1

      // Draw combo
      if (combo > 1) {
        ctx.font = 'bold 48px Arial'
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 4
        ctx.textAlign = 'center'
        ctx.strokeText(`${combo}x COMBO!`, canvas.width / 2, 100)
        ctx.fillText(`${combo}x COMBO!`, canvas.width / 2, 100)
      }

      // Draw score
      ctx.font = 'bold 32px Arial'
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 3
      ctx.textAlign = 'left'
      ctx.strokeText(`Score: ${score}`, 20, 40)
      ctx.fillText(`Score: ${score}`, 20, 40)

      requestAnimationFrame(animate)
    }

    const handleMouseMove = (e: MouseEvent) => {
      prevMouseX = mouseX
      prevMouseY = mouseY
      mouseX = e.clientX
      mouseY = e.clientY

      if (isPlaying) {
        sliceTrail.push({ x: mouseX, y: mouseY, time: Date.now() })
        if (sliceTrail.length > 20) sliceTrail.shift()

        fruits.forEach(fruit => checkSlice(fruit))
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      prevMouseX = mouseX
      prevMouseY = mouseY
      mouseX = touch.clientX
      mouseY = touch.clientY

      if (isPlaying) {
        sliceTrail.push({ x: mouseX, y: mouseY, time: Date.now() })
        if (sliceTrail.length > 20) sliceTrail.shift()

        fruits.forEach(fruit => checkSlice(fruit))
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })

    animate()

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchmove', handleTouchMove)
    }
  }, [isPlaying, score])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <canvas ref={canvasRef} />

      {!isPlaying && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white'
        }}>
          <h1 style={{ fontSize: '64px', marginBottom: '20px', textShadow: '4px 4px 8px rgba(0,0,0,0.5)' }}>
            🍎 Fruit Cutting ASMR 🔪
          </h1>
          <button
            onClick={() => {
              setIsPlaying(true)
              setScore(0)
            }}
            style={{
              fontSize: '32px',
              padding: '20px 60px',
              borderRadius: '50px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s',
              fontWeight: 'bold'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Start Slicing
          </button>
          <p style={{ marginTop: '20px', fontSize: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            Move your mouse or finger to slice the fruits!
          </p>
        </div>
      )}

      {isPlaying && (
        <button
          onClick={() => setIsPlaying(false)}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            fontSize: '18px',
            padding: '10px 30px',
            borderRadius: '25px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#764ba2',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          Pause
        </button>
      )}
    </div>
  )
}
