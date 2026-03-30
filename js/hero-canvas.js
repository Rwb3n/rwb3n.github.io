// Hero network canvas animation (index page only)
(function () {
    var canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var root = document.documentElement;
    var w, h, dpr;
    var nodes = [];
    var mouse = { x: -9999, y: -9999 };
    var animId;

    var CONFIG = {
        nodeCount: 30,
        maxSpeed: 0.15,
        connectionDistance: 120,
        mouseRadius: 150,
        mouseForce: 0.025,
        pulseChance: 0.0008,
        pulseSpeed: 1.5,
        nodeRadius: 1,
        lineWidth: 0.3,
    };

    function getColors() {
        var isDark = root.getAttribute('data-theme') !== 'light';
        return {
            node: isDark ? 'rgba(245, 240, 232, 0.2)' : 'rgba(10, 10, 18, 0.12)',
            nodeActive: isDark ? 'rgba(245, 240, 232, 0.45)' : 'rgba(10, 10, 18, 0.3)',
            line: isDark ? 'rgba(245, 240, 232, 0.03)' : 'rgba(10, 10, 18, 0.025)',
            lineActive: isDark ? 'rgba(245, 240, 232, 0.07)' : 'rgba(10, 10, 18, 0.06)',
            pulse: isDark ? 'rgba(255, 107, 53, 0.5)' : 'rgba(224, 90, 40, 0.4)',
            pulseGlow: isDark ? 'rgba(255, 107, 53, 0.08)' : 'rgba(224, 90, 40, 0.06)',
        };
    }

    function resize() {
        dpr = window.devicePixelRatio || 1;
        var rect = canvas.parentElement.getBoundingClientRect();
        w = rect.width;
        h = rect.height;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createNode() {
        return {
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * CONFIG.maxSpeed,
            vy: (Math.random() - 0.5) * CONFIG.maxSpeed,
            baseSpeed: CONFIG.maxSpeed,
        };
    }

    function initNodes() {
        nodes = [];
        var area = w * h;
        var count = Math.min(CONFIG.nodeCount, Math.floor(area / 30000) + 12);
        for (var i = 0; i < count; i++) {
            nodes.push(createNode());
        }
    }

    var pulses = [];

    function spawnPulse(ax, ay, bx, by) {
        pulses.push({
            ax: ax, ay: ay, bx: bx, by: by,
            t: 0,
            speed: CONFIG.pulseSpeed,
            dist: Math.hypot(bx - ax, by - ay),
        });
    }

    function update() {
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];

            var dx = n.x - mouse.x;
            var dy = n.y - mouse.y;
            var dist = Math.hypot(dx, dy);
            if (dist < CONFIG.mouseRadius && dist > 0) {
                var force = (1 - dist / CONFIG.mouseRadius) * CONFIG.mouseForce;
                n.vx += (dx / dist) * force;
                n.vy += (dy / dist) * force;
            }

            n.vx *= 0.995;
            n.vy *= 0.995;

            var speed = Math.hypot(n.vx, n.vy);
            if (speed > n.baseSpeed * 2) {
                n.vx = (n.vx / speed) * n.baseSpeed * 2;
                n.vy = (n.vy / speed) * n.baseSpeed * 2;
            }

            n.x += n.vx;
            n.y += n.vy;

            var pad = 50;
            if (n.x < -pad) n.x = w + pad;
            if (n.x > w + pad) n.x = -pad;
            if (n.y < -pad) n.y = h + pad;
            if (n.y > h + pad) n.y = -pad;
        }

        for (var i = pulses.length - 1; i >= 0; i--) {
            var p = pulses[i];
            p.t += p.speed / p.dist;
            if (p.t >= 1) {
                pulses.splice(i, 1);
            }
        }
    }

    function draw() {
        var colors = getColors();
        ctx.clearRect(0, 0, w, h);

        for (var i = 0; i < nodes.length; i++) {
            for (var j = i + 1; j < nodes.length; j++) {
                var a = nodes[i];
                var b = nodes[j];
                var dx = a.x - b.x;
                var dy = a.y - b.y;
                var dist = Math.hypot(dx, dy);

                if (dist < CONFIG.connectionDistance) {
                    var alpha = 1 - dist / CONFIG.connectionDistance;
                    var mx = (a.x + b.x) / 2;
                    var my = (a.y + b.y) / 2;
                    var mouseDist = Math.hypot(mx - mouse.x, my - mouse.y);
                    var isNearMouse = mouseDist < CONFIG.mouseRadius * 0.8;

                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = isNearMouse ? colors.lineActive : colors.line;
                    ctx.globalAlpha = alpha;
                    ctx.lineWidth = CONFIG.lineWidth;
                    ctx.stroke();
                    ctx.globalAlpha = 1;

                    if (Math.random() < CONFIG.pulseChance) {
                        spawnPulse(a.x, a.y, b.x, b.y);
                    }
                }
            }
        }

        for (var i = 0; i < pulses.length; i++) {
            var p = pulses[i];
            var px = p.ax + (p.bx - p.ax) * p.t;
            var py = p.ay + (p.by - p.ay) * p.t;

            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = colors.pulseGlow;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(px, py, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = colors.pulse;
            ctx.fill();
        }

        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            var mouseDist = Math.hypot(n.x - mouse.x, n.y - mouse.y);
            var isNearMouse = mouseDist < CONFIG.mouseRadius;

            ctx.beginPath();
            ctx.arc(n.x, n.y, isNearMouse ? CONFIG.nodeRadius * 1.3 : CONFIG.nodeRadius, 0, Math.PI * 2);
            ctx.fillStyle = isNearMouse ? colors.nodeActive : colors.node;
            ctx.fill();
        }
    }

    function loop() {
        update();
        draw();
        animId = requestAnimationFrame(loop);
    }

    var heroSection = canvas.parentElement;

    heroSection.addEventListener('mousemove', function (e) {
        var rect = heroSection.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    heroSection.addEventListener('mouseleave', function () {
        mouse.x = -9999;
        mouse.y = -9999;
    });

    function init() {
        resize();
        initNodes();
        loop();
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            resize();
            initNodes();
        }, 200);
    });

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            cancelAnimationFrame(animId);
        } else {
            loop();
        }
    });

    init();
})();
