import { ArcadeCameraCruise, ArcadePlayer, Empty_Manifold, satAABB } from "./arcade";
import { AudioPlayer } from "./audioplayer";
import { type Box, type Sign } from "./collision"
import { Keyboard } from "./keyboard";
import { song_hello } from "./songs";

export class AnimationShot {
    frame = 0

    tSec = 0
    fps = 4

    dead = false

    get x() {
        return this.frames[this.frame]
    }

    constructor(readonly frames: number[]) { }

    update(dt: number) {
        let dtSec = dt * 0.001

        this.tSec += dtSec

        let frameDuration = 1 / this.fps

        if (this.tSec > frameDuration) {
            this.frame += 1
            if (this.frame >= this.frames.length) {
                this.dead = true
                this.frame -= 1
            }
            this.tSec %= frameDuration
        }
    }
}



export class AnimationLoop {
    frame = 0

    tSec = 0
    fps = 4

    get x() {
        return this.frames[this.frame]
    }

    constructor(readonly frames: number[]) { }

    update(dt: number) {
        let dtSec = dt * 0.001

        this.tSec += dtSec

        let frameDuration = 1 / this.fps

        if (this.tSec > frameDuration) {
            this.frame += 1
            if (this.frame >= this.frames.length) {
                this.frame = 0
            }
            this.tSec %= frameDuration
        }
    }
}

class RainDrop {

    animation = new AnimationLoop([0, 1, 2, 3])

    constructor(public x: number, public y: number) {
        this.animation.fps = 12
    }

    update(dt: number) {
        this.x -= dt * 0.1
        this.y += dt * 0.3
        this.animation.update(dt)
    }

}

class RainDrop2 {
    animation = new AnimationShot([0, 1, 1, 2, 2, 1, 3, 3])

    v = -20 - Math.random() * -20
    constructor(public x: number, public y: number) {
        this.animation.fps = 3 + Math.random() * 2
    }

    life = 600
    update(dt: number) {
        this.v *= 0.8

        this.y += this.v * dt * 0.01
        this.y += dt * 0.01
        this.life -= dt
        this.animation.update(dt)
    }


}

class Dust {
    animation = new AnimationShot([0, 0, 1, 1, 2, 3, 3])

    constructor(readonly x: number, readonly y: number) {
        this.animation.fps = 24
    }

    update(dt: number) {
        this.animation.update(dt)
    }
}

class Platform {

    get box() {
        return { x: this.x, y: 360 - this.height, w: this.width, h: this.height }
    }

    constructor(public x: number, public height: number, readonly width: number, readonly label: PlatformLabel) { }
}

export class Spring {
    position: number;
    velocity = 0;
    target: number;
    stiffness: number;
    damping: number;

    constructor(position: number, target = position, stiffness = 170, damping = 26) {
        this.position = position;
        this.target = target;
        this.stiffness = stiffness;
        this.damping = damping;
    }

    update(dt: number) {
        let dtSec = dt * 0.001
        const force = (this.target - this.position) * this.stiffness - this.velocity * this.damping;
        this.velocity += force * dtSec;
        this.position += this.velocity * dtSec;
    }
}

export function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t
}



export class Camera {

    readonly _frustum: Box

    shake_spring_x = new Spring(0, 0, 700, 6)
    shake_spring_y = new Spring(0, 0, 500, 8)

    shake_cool = 500

    shake() {
        this.shake_spring_x.velocity -= this.shake_cool * 0.9
        this.shake_spring_y.velocity -= this.shake_cool * 1.3

        this.shake_cool -= 100
    }

    get frustum() {
        return { x: this.shake_spring_x.position + this._frustum.x, y: this.shake_spring_y.position + this._frustum.y, w: this._frustum.w, h: this._frustum.h }
    }

    constructor(readonly gameWidth: number, readonly gameHeight: number) {
        this._frustum = { x: 0, y: 0, w: gameWidth, h: gameHeight }
    }

    get left() {
        return this.frustum.x
    }

    get right() {
        return this.frustum.x + this.frustum.w
    }

    get top() {
        return this.frustum.y
    }

    get bottom() {
        return this.frustum.y + this.frustum.h
    }


    panCenter(x: number, y: number) {
        let targetX = x - this.gameWidth / 2
        let targetY = y - this.gameHeight / 2

        this._frustum.x = targetX
        this._frustum.y = targetY
    }


    lerpPanCenter(x: number, y: number) {
        let targetX = x - this.gameWidth / 2
        let targetY = y - this.gameHeight / 2

        this._frustum.x = this._frustum.x + (targetX - this._frustum.x) * 0.07
        this._frustum.y = this._frustum.y + (targetY - this._frustum.y) * 0.3
    }

    update(dt: number) {
        this.shake_spring_x.update(dt)
        this.shake_spring_y.update(dt)

        this.shake_cool = Math.min(500, this.shake_cool + dt * 0.18)
    }
}



export class CameraZones {

    static Deadzone: Box = { x: 290, y: -40, w: 120, h: 160 }

    arcade = ArcadeCameraCruise.create()

    followDeadzone(target_x: number, target_y: number) {
        let camera_x = this.arcade.body.x
        let camera_y = this.arcade.body.y
        let deadzone = CameraZones.Deadzone

        let deadzone_req_h: Sign = 0
        let deadzone_req_v: Sign = 0

        if (camera_x < target_x + deadzone.x) {
            deadzone_req_h = 1
        } else if (camera_x > target_x + deadzone.x + deadzone.w) {
            deadzone_req_h = -1
        }

        if (camera_y < target_y + deadzone.y) {
            deadzone_req_v = 1
        } else if (camera_y > target_y + deadzone.y + deadzone.h) {
            deadzone_req_v = -1
        }

        if (target_y + deadzone.y > 300) {
            deadzone_req_v = 0
        }

        this.arcade.deadzones = {
            horizontal: deadzone_req_h as Sign,
            vertical: deadzone_req_v
        }
    }

    update(dt: number) {
        this.arcade.update(dt)
    }
}

class Trail {

    animation = new AnimationShot([0, 1, 2, 3, 4, 5, 6])

    constructor(readonly x: number, readonly y: number) {
        this.animation.fps = 12
    }

    update(dt: number) {
        this.animation.update(dt)
    }
}

class Trails {
    trails: Trail[]

    constructor() {
        this.trails = []
    }

    cool = 200

    update(dt: number) {
        for (let trail of this.trails) {
            trail.update(dt)
        }

        if (game.unicorn.arcade.state === 'landed2') {
            if (game.unicorn.animation.frame === 1) {
                if (this.cool === 0) {
                    this.trails.push(new Trail(game.unicorn.box.x, game.unicorn.box.y + game.unicorn.box.h - 24))
                    this.cool = 60
                }
            }
            if (game.unicorn.animation.frame === 3) {
                if (this.cool === 0) {
                    this.trails.push(new Trail(game.unicorn.box.x + 48, game.unicorn.box.y + game.unicorn.box.h - 24))
                    this.cool = 160
                }
            }
        }
        this.cool = Math.max(0, this.cool - dt)

        this.trails = this.trails.filter(_ => !_.animation.dead)
    }
}

class Unicorn {
    get box() {
        return { x: this.arcade.body.x, y: this.arcade.body.y, w: 48 * 2, h: 36 * 2 }
    }
    get down_box() {
        return { x: this.arcade.body.x - 12, y: this.arcade.body.y + 36 * 2, w: 48 + 48 + 12, h: 36 }
    }

    arcade = ArcadePlayer.create()

    animation = new AnimationLoop([0, 1, 2, 3])

    constructor() {
        this.arcade.body.ahs = 1
        this.arcade.body.vhs = 1
        this.animation.fps = 7.5
    }

    update(dt: number) {
        this.arcade.butt = {
            req_jump: keyboard.getActionSign('jump')
        }

        if (this.arcade.state === 'jump') {
            audio.playAudio('jump')
        }

        this.arcade.update(dt)

        this.animation.update(dt)
    }
}

type PlatformLabel = '0' | '1' | '2' | '3' | '4' | '5'
class PlatformGenerator {

    static Patterns = `4 0 111 232 21 2  3 2 1  2 1 21 5 21 12 1 5  2 32 5 2321 1 32 21 32 5 2 3 5 3 32 31 3 5 2 1 5 3 2 5 2 3 2 3 3 3 2 2 2 5 5 5 2 1  2  32`

    stash: Record<PlatformLabel, Platform[]>

    blit_canvas: Record<PlatformLabel, HTMLCanvasElement>

    iPattern = 0

    x = -320

    constructor() {
        this.stash = {
            '5': [new Platform(0, 330, 1620, '5')],
            '4': [new Platform(0, 365, 1920, '4')],
            '0': [new Platform(0, 360, 1920, '0')],
            '1': [new Platform(0, 280, 600, '1'), new Platform(0, 280, 600, '1'), new Platform(0, 280, 600, '1'),],
            '2': [new Platform(0, 320, 300, '2'), new Platform(0, 240, 300, '2'), new Platform(0, 240, 300, '2'),],
            '3': [new Platform(0, 240, 200, '3'), new Platform(0, 240, 200, '3'), new Platform(0, 240, 200, '3')],
        }

        this.blit_canvas = {
            '5': document.createElement('canvas'),
            '4': document.createElement('canvas'),
            '0': document.createElement('canvas'),
            '1': document.createElement('canvas'),
            '2': document.createElement('canvas'),
            '3': document.createElement('canvas'),
        }


        let tcx = cx
        for (let p of ['5', '4', '0', '1', '2', '3']) {
            let canvas = this.blit_canvas[p as PlatformLabel]
            canvas.width = 1920
            canvas.height = 1080
            let pcx = canvas.getContext('2d')!
            pcx.imageSmoothingEnabled = false
            cx = pcx
            render_platform(this.stash[p as PlatformLabel][0])
        }
        cx = tcx
    }

    pullPlatform(): Platform {
        let pattern = PlatformGenerator.Patterns[this.iPattern]
        if (this.iPattern < PlatformGenerator.Patterns.length - 1) {
            this.iPattern += 1
        } else {
            this.iPattern = 1
        }
        let large_gap = 100 + Math.random() * 30
        if (pattern === ' ') {
            this.x += large_gap
            return this.pullPlatform()
        }
        let small_gap = 70 + Math.random() * 30
        let res = this.stash[pattern as PlatformLabel].pop()!
        res.x = this.x
        this.x += res.width
        this.x += small_gap
        return res
    }

    update() {

        while (game.platforms.length < 3) {
            game.platforms.push(this.pullPlatform())
        }

        let leftMost = game.platforms[0]
        if (leftMost.x + leftMost.width < game.camera.left) {
            let res = game.platforms.splice(0, 1)[0]
            this.stash[res.label].push(res)
        }


    }
}

class Cloud {
    drops2: RainDrop2[]
    rain_drops: RainDrop[]

    rain_cool = 200

    rain() {
        let cut = 16 + Math.random() * 16
        for (let i = 0; i < 70; i++) {
            if (i > cut) break
            this.rain_drops.push(new RainDrop(30 + i * 16, -10 - Math.random() * 20 - Math.random() * 100))
            this.rain_drops.push(new RainDrop(30 + (i + 10) * 16, -10 - Math.random() * 20 - Math.random() * 100))
            this.rain_drops.push(new RainDrop(70 * 16 - i * 16, -10 - Math.random() * 20))
        }
    }

    constructor(public x: number, public y: number) {
        this.rain_drops = []
        this.drops2 = []
        this.rain()
    }

    update(dt: number) {


        this.rain_cool = Math.max(0, this.rain_cool - dt)

        if (this.rain_cool === 0) {
            this.rain()
            this.rain_cool = 100 + Math.random() * 300
        }

        for (let drop of this.rain_drops) {
            drop.update(dt)
        }

        let platform = game.platforms.find(_ => _.x + _.width > game.camera.frustum.x)!
        if (platform.label === '4' || platform.label === '5') {
            let res = []
            for (let drop of this.rain_drops) {
                let x = drop.x + game.camera.frustum.x
                let y = drop.y + game.camera.frustum.y - 16
                if (x > platform.x && x < platform.x + platform.width - 24 && y > 360 - platform.height - 16 && y < 360 - platform.height - 16 + 16) {
                    this.drops2.push(new RainDrop2(x, y))
                } else {
                    res.push(drop)
                }
            }
            this.rain_drops = res
        }

        for (let drop2 of this.drops2) {
            drop2.update(dt)
        }

        this.drops2 = this.drops2.filter(_ => _.life > 0)

    }
}

class Game {

    show_end_menu = false
    enable_reset = 0

    camera: Camera
    cameraZones: CameraZones

    generator: PlatformGenerator
    platforms: Platform[]

    unicorn: Unicorn

    dust: Dust[]

    trails: Trails

    cloud: Cloud

    constructor() {
        this.trails = new Trails()
        this.cloud = new Cloud(0, 0)
        this.dust = []
        this.generator = new PlatformGenerator()
        this.platforms = []
        this.camera = new Camera(640, 360)
        this.cameraZones = new CameraZones()
        this.unicorn = new Unicorn()
        this.unicorn.arcade.body.x = -100
        this.unicorn.arcade.body.y = -80

        this.camera.panCenter(
            this.cameraZones.arcade.body.x,
            this.cameraZones.arcade.body.y,
        )
    }

    update(dt: number) {

        this.generator.update()

        this.cameraZones.followDeadzone(
            this.unicorn.box.x + this.unicorn.box.w / 2,
            this.unicorn.box.y + this.unicorn.box.h / 2,
        )

        this.cameraZones.update(dt)

        this.camera.lerpPanCenter(
            this.cameraZones.arcade.body.x,
            this.cameraZones.arcade.body.y,
        )


        this.unicorn.arcade.coll = { box: Empty_Manifold, down: Empty_Manifold }
        for (let j = this.platforms.length - 1; j >= 0; j--) {
            let box = satAABB(this.platforms[j].box, this.unicorn.box)
            let down = satAABB(this.platforms[j].box, this.unicorn.down_box)
            if (box.colliding || down.colliding) {
                this.unicorn.arcade.coll = { box, down }
                break
            }
        }

        if (this.unicorn.arcade.state === 'landed') {
            this.dust = []
            this.dust.push(new Dust(this.unicorn.box.x, this.unicorn.box.y))

            this.camera.shake()
            audio.playAudio('landed')
        }

        if (this.unicorn.arcade.body.y > 400) {
            if (!game.show_end_menu) {
                game.show_end_menu = true
                game.enable_reset = 1453
                audio.playAudio('over')
                audio.stopAudio('main')
            }
        }

        game.enable_reset = Math.max(0, game.enable_reset - dt)

        if (game.show_end_menu && game.enable_reset === 0) {

            game.unicorn.arcade.state = 'idle'

            if (keyboard.getActionSign('jump') !== 'up') {
                game = new Game()
                audio.playAudio('main', true)
            }
        }

        for (let dust of this.dust) {
            dust.update(dt)
        }

        this.unicorn.update(dt)

        this.camera.update(dt)

        this.cloud.update(dt)

        this.trails.update(dt)
    }
}


let game: Game
export function _init() {
    game = new Game()
}


let t = 0
let first_update_called = false
let first_key_pressed = false
let first_audio_initialized = false
export function _update(dt: number) {
    t += dt;

    first_update_called = true

    if (keyboard.is_just_down('jump')) {
        first_key_pressed = true
    }

    if (first_key_pressed && !first_audio_initialized) {
        first_audio_initialized = true
        audio.playAudio('main', true)
    }

    game.update(dt)

    keyboard.update()
    audio.update(dt)
}


export function _render() {
    if (!first_update_called) return

    let sy = vheight / 360
    let sx = sy
    cx.setTransform(sx, 0, 0, sy, 0, 0)

    cx.fillStyle = '#e4d2aa'
    cx.fillRect(0, 0, 640, 360)

    for (let drop of game.cloud.rain_drops) {
        draw_spr(192, 160 + drop.animation.x * 8, 8, 8, drop.x, drop.y, 2, 2)
    }



    cx.translate(-game.camera.frustum.x, -game.camera.frustum.y)


    for (let platform of game.platforms) {
        let w = platform.width
        let h = platform.height
        let x = platform.x
        let y = 360 - h
        cx.drawImage(game.generator.blit_canvas[platform.label], 0, 0, w, h, x, y, w, h)
    }

    render_unicorn()

    for (let dust of game.dust) {
        draw_spr(0 + dust.animation.x * 48, 120, 48, 48, dust.x, dust.y, 1.8, 1.8)
    }
    for (let drop2 of game.cloud.drops2) {
        draw_spr(192, 128 + drop2.animation.x * 8, 8, 8, drop2.x, drop2.y, 2, 2)
    }

    for (let trail of game.trails.trails) {
        draw_spr(0 + trail.animation.x * 24, 112, 24, 8, trail.x, trail.y, 3, 3)
    }


    if (game.show_end_menu) {

    }

    if (false) {
        render_box(game.unicorn.box)
        render_box(game.unicorn.down_box)
        for (let platform of game.platforms) {
            render_box(platform.box)
        }
    }
}

function render_unicorn() {
    draw_spr(0 + game.unicorn.animation.x * 48, 160, 48, 36, game.unicorn.box.x, game.unicorn.box.y, 2, 2)
}

function render_platform(platform: Platform) {
    let _sx = 0
    if (platform.label === '4' || platform.label === '5') {
        _sx = 24
    }
    let x = 0
    let y = 0
    draw_spr(_sx + 0, 0, 8, 8, x, y, 4, 4)
    for (let i = 8 * 4; i < platform.width - 8 * 4; i += 8 * 4) {
        draw_spr(_sx + 8, 0, 8, 8, x + i, y, 4, 4)
    }
    draw_spr(_sx + 16, 0, 8, 8, x + platform.width - 8 * 4, y, 4, 4)

    for (let j = 8 * 4; j < platform.height - 8 * 4; j += 8 * 4) {
        draw_spr(_sx + 0, 8, 8, 8, x, y + j, 4, 4)
        for (let i = 8 * 4; i < platform.width - 8 * 4; i += 8 * 4) {
            draw_spr(_sx + 8, 8, 8, 8, x + i, y + j, 4, 4)
        }
        draw_spr(_sx + 16, 8, 8, 8, x + platform.width - 8 * 4, y + j, 4, 4)
    }
}

export function render_log_horizontal() {
    cx.fillStyle = 'white'
    cx.font = '20px sans-serif'
    cx.textBaseline = 'top'
    //cx.fillText(log_horizontal(game.cursor.arcade.body, ''), 0, 0)
}

export function draw_spr(sx: number, sy: number, sw: number, sh: number, x: number, y: number, scale_x: number, scale_y: number) {
    const inset = 0.5;
    cx.drawImage(spr_png, sx + inset, sy + inset, sw - inset * 2, sh - inset * 2, x, y, (sw * scale_x) + inset, (sh * scale_y) + inset);
    //cx.drawImage(spr_png, sx, sy, sw, sh, x, y, Math.floor(sw * scale_x), Math.floor(sh * scale_y))
}

let audio: AudioPlayerManager
let spr_png!: HTMLImageElement
export async function _load() {

    audio = await AudioPlayerManager.loadAudio()

    spr_png = new Image()
    spr_png.src = './sprites.png'
    return Promise.all([
        new Promise(resolve => spr_png.onload = resolve),
    ])
}

let cx: CanvasRenderingContext2D
export function _set_ctx(ctx: CanvasRenderingContext2D) {
    cx = ctx
}

//@ts-ignore
let vwidth = 0
let vheight = 0
export function _set_viewport(_top: number, _left: number, width: number, height: number, _clientWidth: number, _clientHeight: number) {
    vwidth = width
    vheight = height
}


let keyboard: Keyboard
export function _set_canvas(canvas: HTMLCanvasElement) {
    keyboard = Keyboard.bindTo(canvas)
    keyboard.add_keymapping('w', 'jump')
    keyboard.add_keymapping('a', 'jump')
    keyboard.add_keymapping('s', 'jump')
    keyboard.add_keymapping('d', 'jump')
    keyboard.add_keymapping('Space', 'jump')
    keyboard.add_keymapping('j', 'jump')
    keyboard.add_keymapping('k', 'jump')
    keyboard.add_keymapping('l', 'jump')
    keyboard.add_keymapping('i', 'jump')
    keyboard.add_keymapping('ArrowUp', 'jump')
    keyboard.add_keymapping('ArrowLeft', 'jump')
    keyboard.add_keymapping('ArrowRight', 'jump')
    keyboard.add_keymapping('ArrowDown', 'jump')
}

export function render_box(box: Box, color = 'white') {
    cx.lineWidth = 1
    cx.strokeStyle = color
    cx.strokeRect(box.x, box.y, box.w, box.h)
}

export type AudioPlayback = { stop: () => void, setVolume: (_: number) => void }

class AudioPlayerManager {
    static loadAudio = async () => {
        let res = new AudioPlayerManager()

        //res.audio.set('broom', await AudioPlayer.init(broom_song, 110))
        res.audio.set('main', await AudioPlayer.init(song_hello, 120))
        res.audio.set('jump', await AudioPlayer.init('AEgc', 270))
        res.audio.set('landed', await AudioPlayer.init('80', 330))
        res.audio.set('over', await AudioPlayer.init('0A3E8g0A2E7e0B3C6c1C0D6a0d1e2fefefa a a 0 0 ;', 130))
        //res.audio.set('end_drag', await AudioPlayer.init(song_hello.slice(6, 7), 330))
        //res.audio.set('begin_drag', await AudioPlayer.init(song_hello.slice(17, 18), 330))
        //res.audio.set('slide', await AudioPlayer.init(song_hello.slice(37, 40), 320))

        //res.audio.set('flash', await AudioPlayer.init(song_hello.slice(8, 13).repeat(2).concat(song_hello.slice(5, 8).repeat(3)).concat(song_hello.slice(0, 5).repeat(2)), 301))
        //res.audio.set('shuffle', await AudioPlayer.init(song_hello.slice(8, 13).repeat(3), 331))
        return res
    }

    audio: Map<string, AudioPlayer> = new Map()

    looping: Map<string, AudioPlayback> = new Map()

    stopAudio(name: string) {
        this.looping.get(name)?.stop()
    }

    playAudio(name: string, loop: boolean = false) {
        let pl = this.audio.get(name)!.play(loop)
        if (loop) {
            this.looping.set(name, pl)
        } else {
            pl.setVolume(0.5)
        }

        if (!loop) {
            this.quiet_cool = 200
        }
    }

    set_looping_quiet_down() {
        for (let pl of this.looping.values()) {
            pl.setVolume(0.1)
        }
    }

    set_looping_quiet_up() {
        for (let pl of this.looping.values()) {
            pl.setVolume(0.8)
        }
    }

    is_quiet = false
    quiet_cool = 0
    change_cool = 0
    update(dt: number) {

        if (this.quiet_cool > 0 && !this.is_quiet) {
            if (this.change_cool === 0) {
                this.is_quiet = true
                this.set_looping_quiet_down()
                this.change_cool = 300
            }
        }

        if (this.quiet_cool === 0 && this.is_quiet) {
            if (this.change_cool === 0) {
                this.is_quiet = false
                this.set_looping_quiet_up()
                this.change_cool = 300
            }
        }

        this.quiet_cool = Math.max(0, this.quiet_cool - dt)
        this.change_cool = Math.max(0, this.change_cool - dt)
    }

}

export function arr_shuffle<A>(array: Array<A>) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array
}