import { Feather } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import Colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";
import { KnowledgeItem } from "@/lib/database";

interface GraphViewProps {
  items: KnowledgeItem[];
  onNodePress: (item: KnowledgeItem) => void;
}

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  tips: "zap",
  terms: "book-open",
  tutorials: "play-circle",
  tools: "tool",
  frameworks: "code",
  other: "file-text",
};

// Substantially larger logical canvas for organic layout
const CANVAS_W = 1600;
const CANVAS_H = 1600;
const NODE_R = 28;
const LABEL_OFFSET = 18;

// Map clusters in a spacious hexagon around the center
const CLUSTER_ANCHORS: Record<string, [number, number]> = {
  tips:       [0.5 + 0.25 * Math.cos(-Math.PI / 2),   0.5 + 0.25 * Math.sin(-Math.PI / 2)],
  terms:      [0.5 + 0.25 * Math.cos(-Math.PI / 6),   0.5 + 0.25 * Math.sin(-Math.PI / 6)],
  tutorials:  [0.5 + 0.25 * Math.cos(Math.PI / 6),    0.5 + 0.25 * Math.sin(Math.PI / 6)],
  tools:      [0.5 + 0.25 * Math.cos(Math.PI / 2),    0.5 + 0.25 * Math.sin(Math.PI / 2)],
  frameworks: [0.5 + 0.25 * Math.cos(5 * Math.PI / 6),0.5 + 0.25 * Math.sin(5 * Math.PI / 6)],
  other:      [0.5 + 0.25 * Math.cos(7 * Math.PI / 6),0.5 + 0.25 * Math.sin(7 * Math.PI / 6)],
};

interface NodePosition { item: KnowledgeItem; x: number; y: number }
interface Transform    { x: number; y: number; scale: number }

// Deterministic simple physics simulation
function computeForceLayout(items: KnowledgeItem[]): NodePosition[] {
  const nodes = items.map(item => ({
    item,
    // Add deterministic randomness based on ID length or character codes to avoid overlap completely
    x: CANVAS_W / 2 + ((item.id * 13) % 400 - 200),
    y: CANVAS_H / 2 + ((item.id * 17) % 400 - 200),
    vx: 0,
    vy: 0,
  }));

  const links: { source: number; target: number; strength: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const shared = nodes[i].item.tags.filter(t => nodes[j].item.tags.includes(t)).length;
      if (shared > 0) links.push({ source: i, target: j, strength: shared });
    }
  }

  const iterations = 150;
  for (let i = 0; i < iterations; i++) {
    const alpha = 1 - i / iterations;
    
    // Links (springs)
    for (const link of links) {
      const s = nodes[link.source];
      const t = nodes[link.target];
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const l = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (l - 120) * 0.05 * link.strength * alpha;
      const fX = (dx / l) * force;
      const fY = (dy / l) * force;
      s.vx += fX; s.vy += fY;
      t.vx -= fX; t.vy -= fY;
    }
    
    // Node repulsion (anti-gravity)
    for (let j = 0; j < nodes.length; j++) {
      for (let k = j + 1; k < nodes.length; k++) {
        const a = nodes[j];
        const b = nodes[k];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const l2 = dx * dx + dy * dy || 1;
        if (l2 < 60000) { // repel nodes that are too close
          const force = (60000 / l2) * 0.8 * alpha;
          const l = Math.sqrt(l2);
          const fX = (dx / l) * force;
          const fY = (dy / l) * force;
          a.vx -= fX; a.vy -= fY;
          b.vx += fX; b.vy += fY;
        }
      }
    }

    // Cluster centers (gravity map)
    for (const n of nodes) {
      const cat = n.item.category || "other";
      const [fx, fy] = CLUSTER_ANCHORS[cat] ?? [0.5, 0.5];
      const targetX = fx * CANVAS_W;
      const targetY = fy * CANVAS_H;
      // Gentle gravity towards category
      n.vx += (targetX - n.x) * 0.04 * alpha;
      n.vy += (targetY - n.y) * 0.04 * alpha;
    }

    // Update positions + friction
    for (const n of nodes) {
      n.vx *= 0.55; 
      n.vy *= 0.55;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  return nodes.map(n => ({ item: n.item, x: n.x, y: n.y }));
}

function buildEdges(positions: NodePosition[]) {
  const edges: Array<{ ax: number; ay: number; bx: number; by: number; strength: number }> = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i].item;
      const b = positions[j].item;
      const shared = a.tags.filter((t) => b.tags.includes(t)).length;
      if (shared > 0) edges.push({ ax: positions[i].x, ay: positions[i].y, bx: positions[j].x, by: positions[j].y, strength: shared });
    }
  }
  return edges;
}

function truncate(s: string, max = 18) { return s.length > max ? s.slice(0, max - 1) + "…" : s; }
function dist2(t: { pageX: number; pageY: number }[]) {
  return Math.sqrt((t[0].pageX - t[1].pageX) ** 2 + (t[0].pageY - t[1].pageY) ** 2);
}

export function GraphView({ items, onNodePress }: GraphViewProps) {
  const { themeStyles, accent } = useTheme();
  const tc = themeStyles.colors;
  const screenBg = typeof themeStyles.screenBg === 'object' && 'backgroundColor' in themeStyles.screenBg 
    ? (themeStyles.screenBg.backgroundColor as string) 
    : "#000";


  // Transform maps container coordinate space to zoomed space
  const [tf, setTf]       = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const tfRef             = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const initialized       = useRef(false);

  const canvasRef         = useRef<View>(null);
  const containerPos      = useRef({ x: 0, y: 0 });

  const baseTf            = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const lastPinchDist     = useRef<number | null>(null);
  const touchStart        = useRef<{ x: number; y: number } | null>(null);
  const didMove           = useRef(false);

  const positions = useMemo(() => computeForceLayout(items), [items]);
  const edges     = useMemo(() => buildEdges(positions), [positions]);

  const sync = (next: Transform) => { tfRef.current = next; setTf(next); };

  const onCanvasLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (!initialized.current && w > 0 && h > 0) {
      initialized.current = true;
      // Fit to screen elegantly width-wise but keeping layout relatively scaled out
      const s  = Math.min(w / 1400, h / 1400, 0.45);
      const cx = w / 2 - (CANVAS_W / 2) * s;
      const cy = h / 2 - (CANVAS_H / 2) * s;
      const init = { x: cx, y: cy, scale: s };
      sync(init);
      baseTf.current = init;
    }

    if (Platform.OS === "web") {
      const rect = (canvasRef.current as any)?.getBoundingClientRect?.();
      if (rect) containerPos.current = { x: rect.left, y: rect.top };
    } else {
      canvasRef.current?.measureInWindow((wx, wy) => {
        containerPos.current = { x: wx, y: wy };
      });
    }
  };

  const toContainer = (px: number, py: number) => ({
    x: px - containerPos.current.x,
    y: py - containerPos.current.y,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder : () => true,

      onPanResponderGrant: (evt, gs) => {
        baseTf.current     = { ...tfRef.current };
        lastPinchDist.current = null;
        didMove.current    = false;
        const c = toContainer(gs.x0, gs.y0);
        touchStart.current = c;
      },

      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches as { pageX: number; pageY: number }[];

        if (touches.length >= 2) {
          didMove.current = true;
          const d    = dist2(touches);
          const midX = (touches[0].pageX + touches[1].pageX) / 2 - containerPos.current.x;
          const midY = (touches[0].pageY + touches[1].pageY) / 2 - containerPos.current.y;

          if (lastPinchDist.current !== null) {
            const ratio    = d / lastPinchDist.current;
            const oldScale = tfRef.current.scale;
            const newScale = Math.max(0.1, Math.min(3, oldScale * ratio));
            sync({
              x:     midX - (midX - tfRef.current.x) * (newScale / oldScale),
              y:     midY - (midY - tfRef.current.y) * (newScale / oldScale),
              scale: newScale,
            });
            baseTf.current = { ...tfRef.current };
          }
          lastPinchDist.current = d;

        } else {
          if (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5) didMove.current = true;
          sync({ x: baseTf.current.x + gs.dx, y: baseTf.current.y + gs.dy, scale: baseTf.current.scale });
        }
      },

      onPanResponderRelease: (_, gs) => {
        lastPinchDist.current = null;
        baseTf.current        = { ...tfRef.current };

        if (!didMove.current && touchStart.current) {
          const canvasX = (touchStart.current.x - tfRef.current.x) / tfRef.current.scale;
          const canvasY = (touchStart.current.y - tfRef.current.y) / tfRef.current.scale;
          // Generous hit box
          const hit = positions.find(({ x, y }) => Math.hypot(x - canvasX, y - canvasY) <= NODE_R + 15);
          if (hit) onNodePress(hit.item);
        }

        didMove.current  = false;
        touchStart.current = null;
      },

      onPanResponderTerminate: () => { lastPinchDist.current = null; didMove.current = false; },
    })
  ).current;

  const handleWheel = Platform.OS === "web"
    ? (e: any) => {
        e.preventDefault?.();
        const factor   = (e.deltaY ?? 0) > 0 ? 0.9 : 1.1;
        const oldScale = tfRef.current.scale;
        const newScale = Math.max(0.1, Math.min(3, oldScale * factor));
        const cx = e.clientX - containerPos.current.x;
        const cy = e.clientY - containerPos.current.y;
        sync({ x: cx - (cx - tfRef.current.x) * (newScale / oldScale), y: cy - (cy - tfRef.current.y) * (newScale / oldScale), scale: newScale });
      }
    : undefined;

  if (items.length === 0) return null;

  return (
    <View style={styles.outer}>
      <View style={styles.canvasContainer}>
        <Text style={[styles.hint, { color: tc.textMuted, backgroundColor: screenBg + "80" }]}>
          Drag · Pinch to zoom · Tap node to open
        </Text>

        {/* ── Canvas ── */}
        <View
          ref={canvasRef}
          style={styles.canvas}
          onLayout={onCanvasLayout}
          // @ts-ignore web only
          onWheel={handleWheel}
          {...panResponder.panHandlers}
        >
          <Svg width="100%" height="100%">
            <Defs>
              {Object.entries(Colors.categories).map(([cat, col]) => (
                <RadialGradient key={cat} id={`grad_${cat}`} cx="30%" cy="30%" rx="70%" ry="70%">
                  <Stop offset="0%"   stopColor={col.text} stopOpacity="0.45" />
                  <Stop offset="100%" stopColor={col.bg}   stopOpacity="0.95" />
                </RadialGradient>
              ))}
              {/* Cool dotted background grid pattern for space tracking */}
              <Pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <Circle cx="20" cy="20" r="1.5" fill={tc.border} fillOpacity={0.6} />
              </Pattern>
            </Defs>

            <G transform={`translate(${tf.x}, ${tf.y}) scale(${tf.scale})`}>
              {/* Enormous infinite grid rectangle */}
              <Rect x={-15000} y={-15000} width={30000} height={30000} fill="url(#gridPattern)" />

              {/* Faint cluster background indicators */}
              {Object.entries(CLUSTER_ANCHORS).map(([cat, [fx, fy]]) => {
                const col = Colors.categories[cat as keyof typeof Colors.categories];
                if (!col) return null;
                return (
                  <G key={`cl_${cat}`}>
                    <Circle cx={fx * CANVAS_W} cy={fy * CANVAS_H} r={180}
                      fill={col.text} fillOpacity={0.015} stroke={col.text} strokeOpacity={0.05} strokeWidth={2} strokeDasharray="10 15" />
                    <SvgText x={fx * CANVAS_W} y={fy * CANVAS_H - 190}
                      fontSize={22} fontWeight="900" fill={col.text} fillOpacity={0.15} textAnchor="middle" letterSpacing={4}>
                      {col.label.toUpperCase()}
                    </SvgText>
                  </G>
                );
              })}

              {/* Sweeping elegant edges */}
              {edges.map((e, i) => {
                const dx = e.bx - e.ax;
                const dy = e.by - e.ay;
                const cx = e.ax + dx / 2 - dy * 0.15;
                const cy = e.ay + dy / 2 + dx * 0.15;
                const d = `M ${e.ax} ${e.ay} Q ${cx} ${cy} ${e.bx} ${e.by}`;
                return (
                  <Path key={i} d={d}
                    fill="none"
                    stroke={accent} strokeOpacity={e.strength >= 2 ? 0.35 : 0.15}
                    strokeWidth={e.strength >= 2 ? 3 : 1.5} strokeLinecap="round" />
                );
              })}

              {/* Glowing nodes */}
              {positions.map(({ item, x, y }) => {
                const col = Colors.categories[item.category as keyof typeof Colors.categories] ?? Colors.categories.other;
                const gradId = Colors.categories[item.category as keyof typeof Colors.categories] ? item.category : "other";
                return (
                  <G key={item.id}>
                    {/* Subtle outer glow effect using a larger faint circle */}
                    <Circle cx={x} cy={y} r={NODE_R + 8} fill={col.text} fillOpacity={0.2} />
                    <Circle cx={x} cy={y} r={NODE_R} fill={`url(#grad_${gradId})`}
                      stroke={col.text} strokeOpacity={0.9} strokeWidth={2} />
                    
                    {/* Readability trick: double text with background stroke */}
                    <SvgText x={x} y={y + NODE_R + LABEL_OFFSET + 3}
                      fontSize={12} fontWeight="800" fill={screenBg} stroke={screenBg} strokeWidth={4} strokeLinejoin="round" textAnchor="middle">
                      {truncate(item.title)}
                    </SvgText>
                    <SvgText x={x} y={y + NODE_R + LABEL_OFFSET + 3}
                      fontSize={12} fontWeight="800" fill={tc.text} textAnchor="middle">
                      {truncate(item.title)}
                    </SvgText>
                  </G>
                );
              })}
            </G>
          </Svg>

          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {positions.map(({ item, x, y }) => {
              const col = Colors.categories[item.category as keyof typeof Colors.categories] ?? Colors.categories.other;
              const icon = CATEGORY_ICONS[item.category] ?? "file-text";
              
              const screenX = tf.x + x * tf.scale;
              const screenY = tf.y + y * tf.scale;
              const size = Math.round(Math.max(10, Math.min(30, 24 * tf.scale)));
              
              // Optimization: hide exceptionally tiny icons
              if (size < 12) return null;

              return (
                <View key={`icon_${item.id}`}
                  style={[styles.iconOverlay, { left: screenX - size/2, top: screenY - size/2, width: size, height: size }]}
                  pointerEvents="none">
                  <Feather name={icon} size={size} color={col.text} />
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
  },
  hint: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    zIndex: 10,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    overflow: "hidden",
  },
  iconOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});

