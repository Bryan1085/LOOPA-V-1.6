import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Box,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Columns,
  Copy,
  Crosshair,
  Eye,
  FlipHorizontal,
  Focus,
  GitMerge,
  Grid,
  GripVertical,
  Hand,
  Layers,
  Link2,
  Maximize2,
  Minimize2,
  Move,
  PaintBucket,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Scissors,
  ScissorsLineDashed,
  Sliders,
  Sparkles,
  Square,
  Trash2,
  Waypoints,
  Wrench,
  X,
} from 'lucide-react';
import {
  DeleteActionType,
  EdgeSelectionTool,
} from '../core/mesh/advancedOperations';
import { EditSelectionMode } from '../core/mesh/operations';
import { PrimitiveOptions, PrimitiveType } from '../core/mesh/primitives';
import {
  clampProportionalRadius,
  PROPORTIONAL_FALLOFF_LIST,
  ProportionalEditingSettings,
  ProportionalFalloff,
} from '../core/mesh/proportionalEditing';
import {
  LeftToolbarDisplayMode,
  reorderSidebarModules,
  SidebarModuleId,
} from '../core/project/storage';
import {
  AxisConstraint,
  MoveSubMode,
  TouchControlSettings,
  TouchModifierKey,
  TouchModifierState,
  TransformTool,
  WorkMode,
} from '../core/project/types';
import { EditOperatorType } from '../state/useModelerStore';
import { DeleteMenuPopover } from './DeleteMenuPopover';
import { PrimitiveMenu } from './PrimitiveMenu';
import { FalloffCurveIcon, ProportionalIcon } from './ProportionalIcons';

interface LeftToolSidebarProps {
  displayMode: LeftToolbarDisplayMode;
  barhomeVisible: boolean;
  moduleOrder: SidebarModuleId[];
  expandedModules: Record<SidebarModuleId, boolean>;
  onCycleDisplayMode: () => void;
  onToggleModuleExpanded: (id: SidebarModuleId) => void;
  onReorderModules: (nextOrder: SidebarModuleId[]) => void;
  onResetModuleLayout: () => void;
  workMode: WorkMode;
  editSelectionMode: EditSelectionMode;
  edgeSelectionTool: EdgeSelectionTool;
  activeTool: TransformTool;
  moveSubMode: MoveSubMode;
  axisConstraint: AxisConstraint;
  activeOperatorType: EditOperatorType | null;
  modalTransformMode?: 'move' | 'vertex_slide' | 'edge_slide' | null;
  canEditSelected: boolean;
  hasSelectedObject: boolean;
  hasSelectedComponents: boolean;
  multiSelectTouch: boolean;
  xrayEditMode: boolean;
  showFaceOrientation: boolean;
  showGrid: boolean;
  proportionalConfig: ProportionalEditingSettings;
  proportionalModifierWarning?: string | null;
  touchSettings: TouchControlSettings;
  effectiveModifiers: TouchModifierState;
  screenModifiers: TouchModifierState;
  onSelectTool: (tool: TransformTool) => void;
  onSelectMoveSubMode: (mode: MoveSubMode) => void;
  onChangeAxisConstraint: (axis: AxisConstraint) => void;
  onGQuickTapMove: () => void;
  onGHoldSlide: () => void;
  onToggleWorkMode: (mode: WorkMode) => void;
  onChangeEditSelectionMode: (mode: EditSelectionMode) => void;
  onChangeEdgeSelectionTool: (tool: EdgeSelectionTool) => void;
  onToggleMultiSelectTouch: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectConnected: () => void;
  onSetModifier: (key: TouchModifierKey, active: boolean) => void;
  onToggleModifier: (key: TouchModifierKey) => void;
  onReleaseAllModifiers: () => void;
  onStartOperator: (type: EditOperatorType) => void;
  onFillSelection: () => void;
  onConnectVertexPath: () => void;
  onExecuteContextualDelete: (action: DeleteActionType) => void;
  onToggleFaceOrientation: () => void;
  onRecalculateOutside: () => void;
  onFlipNormals: () => void;
  onToggleXray: () => void;
  onToggleGrid: () => void;
  onMarkSeams?: (isSeam: boolean) => void;
  onSelectSeams?: () => void;
  onDeselectSeams?: () => void;
  seamCount?: number;
  onToggleProportional: () => void;
  onToggleProportionalConnected: () => void;
  onChangeProportionalFalloff: (falloff: ProportionalFalloff) => void;
  onChangeProportionalRadius: (radius: number) => void;
  onAddPrimitive: (type: PrimitiveType, options?: PrimitiveOptions) => void;
  onDuplicateObject: () => void;
  onApplyObjectTransform: () => void;
  onCenterObjectOrigin: () => void;
  onSeparateSelectedGeometry: () => void;
  onFocusCamera: () => void;
  onOpenToolSettings: () => void;
}

interface ModuleDescriptor {
  id: SidebarModuleId;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  visible: boolean;
  renderBody: () => React.ReactNode;
}

interface PendingDragState {
  id: SidebarModuleId;
  label: string;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  grabOffsetY: number;
  cardLeft: number;
  cardWidth: number;
  timerId: number | null;
}

interface ActiveDragState {
  id: SidebarModuleId;
  label: string;
  pointerId: number;
  pointerY: number;
  grabOffsetY: number;
  cardLeft: number;
  cardWidth: number;
  targetVisibleSlot: number;
}

interface CompactTooltipState {
  label: string;
  top: number;
}

const G_HOLD_THRESHOLD_MS = 400;
const TOUCH_DRAG_HOLD_MS = 260;
const MOUSE_DRAG_HOLD_MS = 120;

export const LeftToolSidebar: React.FC<LeftToolSidebarProps> = ({
  displayMode,
  barhomeVisible,
  moduleOrder,
  expandedModules,
  onCycleDisplayMode,
  onToggleModuleExpanded,
  onReorderModules,
  onResetModuleLayout,
  workMode,
  editSelectionMode,
  edgeSelectionTool,
  activeTool,
  moveSubMode,
  axisConstraint,
  activeOperatorType,
  modalTransformMode = null,
  canEditSelected,
  hasSelectedObject,
  hasSelectedComponents,
  multiSelectTouch,
  xrayEditMode,
  showFaceOrientation,
  showGrid,
  proportionalConfig,
  proportionalModifierWarning = null,
  touchSettings,
  effectiveModifiers,
  screenModifiers,
  onSelectTool,
  onSelectMoveSubMode,
  onChangeAxisConstraint,
  onGQuickTapMove,
  onGHoldSlide,
  onToggleWorkMode,
  onChangeEditSelectionMode,
  onChangeEdgeSelectionTool,
  onToggleMultiSelectTouch,
  onSelectAll,
  onDeselectAll,
  onSelectConnected,
  onSetModifier,
  onToggleModifier,
  onReleaseAllModifiers,
  onStartOperator,
  onFillSelection,
  onConnectVertexPath,
  onExecuteContextualDelete,
  onToggleFaceOrientation,
  onRecalculateOutside,
  onFlipNormals,
  onToggleXray,
  onToggleGrid,
  onMarkSeams,
  onSelectSeams,
  onDeselectSeams,
  seamCount = 0,
  onToggleProportional,
  onToggleProportionalConnected,
  onChangeProportionalFalloff,
  onChangeProportionalRadius,
  onAddPrimitive,
  onDuplicateObject,
  onApplyObjectTransform,
  onCenterObjectOrigin,
  onSeparateSelectedGeometry,
  onFocusCamera,
  onOpenToolSettings,
}) => {
  const [showPrimitivePopover, setShowPrimitivePopover] = useState(false);
  const [showDeletePopover, setShowDeletePopover] = useState(false);
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
  const [pendingDragId, setPendingDragId] = useState<SidebarModuleId | null>(null);
  const [compactTooltip, setCompactTooltip] =
    useState<CompactTooltipState | null>(null);

  const isHidden = displayMode === 'hidden';
  const isCompact = displayMode === 'compact';
  const lastVisibleLayoutRef = useRef<'expanded' | 'compact'>('expanded');
  if (displayMode === 'expanded' || displayMode === 'compact') {
    lastVisibleLayoutRef.current = displayMode;
  }

  const gHoldTimerRef = useRef<number | null>(null);
  const gHoldTriggeredRef = useRef(false);
  const gPointerIdRef = useRef<number | null>(null);
  const compactTooltipTimerRef = useRef<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const moduleCardRefs = useRef<Map<SidebarModuleId, HTMLDivElement>>(new Map());
  const pendingDragRef = useRef<PendingDragState | null>(null);
  const activeDragRef = useRef<ActiveDragState | null>(null);

  useEffect(() => {
    activeDragRef.current = activeDrag;
  }, [activeDrag]);

  const hideCompactTooltip = useCallback(() => {
    if (compactTooltipTimerRef.current !== null) {
      window.clearTimeout(compactTooltipTimerRef.current);
      compactTooltipTimerRef.current = null;
    }
    setCompactTooltip(null);
  }, []);

  const showCompactTooltip = useCallback(
    (label: string, el: HTMLElement, durationMs?: number) => {
      if (displayMode !== 'compact') return;
      if (compactTooltipTimerRef.current !== null) {
        window.clearTimeout(compactTooltipTimerRef.current);
        compactTooltipTimerRef.current = null;
      }
      const rect = el.getBoundingClientRect();
      const clampedTop = Math.max(
        56,
        Math.min(window.innerHeight - 28, rect.top + rect.height * 0.5),
      );
      setCompactTooltip({ label, top: clampedTop });
      if (durationMs && durationMs > 0) {
        compactTooltipTimerRef.current = window.setTimeout(() => {
          compactTooltipTimerRef.current = null;
          setCompactTooltip(null);
        }, durationMs);
      }
    },
    [displayMode],
  );

  useEffect(() => {
    if (isHidden) {
      setShowPrimitivePopover(false);
      setShowDeletePopover(false);
    }
    if (!isCompact || activeDrag !== null) {
      hideCompactTooltip();
    }
  }, [activeDrag, hideCompactTooltip, isCompact, isHidden]);

  useEffect(() => {
    return () => {
      if (compactTooltipTimerRef.current !== null) {
        window.clearTimeout(compactTooltipTimerRef.current);
      }
    };
  }, []);

  const clearGHoldTimer = () => {
    if (gHoldTimerRef.current !== null) {
      window.clearTimeout(gHoldTimerRef.current);
      gHoldTimerRef.current = null;
    }
  };

  const handleGPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    clearGHoldTimer();
    gHoldTriggeredRef.current = false;
    gPointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture edge cases
    }
    gHoldTimerRef.current = window.setTimeout(() => {
      gHoldTimerRef.current = null;
      gHoldTriggeredRef.current = true;
      onGHoldSlide();
    }, G_HOLD_THRESHOLD_MS);
  };

  const handleGPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (gPointerIdRef.current !== e.pointerId) return;
    gPointerIdRef.current = null;
    clearGHoldTimer();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release edge cases
    }
    if (!gHoldTriggeredRef.current) {
      onGQuickTapMove();
    }
  };

  const handleGPointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    gPointerIdRef.current = null;
    clearGHoldTimer();
    gHoldTriggeredRef.current = false;
  };

  const anyModifierActive =
    effectiveModifiers.shift || effectiveModifiers.ctrl || effectiveModifiers.alt;
  const isHoldMode = touchSettings.modifierPanelMode === 'hold';
  const radiusText =
    proportionalConfig.radius >= 10
      ? proportionalConfig.radius.toFixed(1)
      : proportionalConfig.radius.toFixed(2);

  const visibleModifierKeys = (['shift', 'ctrl', 'alt'] as TouchModifierKey[]).filter(
    (k) =>
      touchSettings.modifiers[k].enabled &&
      touchSettings.modifiers[k].showScreenButton,
  );

  const compactTipProps = (label: string) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (isCompact) showCompactTooltip(label, e.currentTarget);
    },
    onMouseLeave: () => {
      if (isCompact) hideCompactTooltip();
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (isCompact) showCompactTooltip(label, e.currentTarget);
    },
    onBlur: () => {
      if (isCompact) hideCompactTooltip();
    },
    onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
      if (isCompact) showCompactTooltip(label, e.currentTarget, 1600);
    },
  });

  const buttonClass = (active: boolean, disabled = false, danger = false) =>
    `w-full ${
      isCompact
        ? 'min-h-[36px] justify-center px-1'
        : 'min-h-[38px] justify-start px-2.5 gap-2 text-xs font-medium'
    } rounded-lg border flex items-center transition-colors touch-manipulation ${
      disabled
        ? 'bg-[#1a1c22] border-transparent text-[#525866] cursor-not-allowed'
        : active
          ? 'bg-[#5ecd6e] border-[#7def8e] text-[#111215] font-semibold shadow-sm'
          : danger
            ? 'bg-[#261a1d] hover:bg-[#352024] border-[#4a2b31] text-[#fca5a5]'
            : 'bg-[#20232b] hover:bg-[#2a2f3a] active:bg-[#323846] border-[#2e3340] text-[#d1d5db] hover:text-white'
    }`;

  const transformItems: {
    id: Extract<TransformTool, 'move' | 'rotate' | 'scale' | 'all'>;
    label: string;
    title: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'move',
      label: 'Mover',
      title: 'Gizmo Mover (X, Y, Z)',
      icon: <Move className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'rotate',
      label: 'Rotar',
      title: 'Gizmo Rotar (anillos)',
      icon: <RotateCw className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'scale',
      label: 'Escalar',
      title: 'Gizmo Escalar (ejes)',
      icon: <Maximize2 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'all',
      label: 'Todo',
      title: 'Gizmo combinado (Mover + Rotar + Escalar)',
      icon: (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 shrink-0"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="4.5" strokeDasharray="3 2" />
          <path d="M8 1.5v3M8 1.5l-1.3 1.3M8 1.5l1.3 1.3" />
          <path d="M14.5 8h-3M14.5 8l-1.3-1.3M14.5 8l-1.3 1.3" />
          <rect x="6.6" y="6.6" width="2.8" height="2.8" fill="currentColor" />
        </svg>
      ),
    },
  ];

  const modelingItems: {
    id: EditOperatorType;
    label: string;
    title: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'extrude',
      label: 'Extruir',
      title: 'Extruir selección (E)',
      icon: <FlipHorizontal className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'inset',
      label: 'Insertar',
      title: 'Insertar caras (I)',
      icon: <Square className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'subdivide',
      label: 'Subdividir',
      title: 'Subdividir geometría',
      icon: <Grid className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'bevel',
      label: 'Biselar',
      title: 'Biselar vértices o aristas (B)',
      icon: <Columns className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'loop_cut',
      label: 'Corte Bucle',
      title: 'Corte de bucle (K)',
      icon: <Scissors className="w-4 h-4 shrink-0" />,
    },
  ];

  const moduleDescriptors: Record<SidebarModuleId, ModuleDescriptor> = {
    selection: {
      id: 'selection',
      label: 'Selección',
      icon: <CheckSquare className="w-3.5 h-3.5 text-[#5ecd6e] shrink-0" />,
      visible: true,
      renderBody: () => (
        <>
          <button
            type="button"
            data-testid="sidebar-multi-select"
            onClick={onToggleMultiSelectTouch}
            aria-pressed={multiSelectTouch}
            aria-label="Selección múltiple por toque"
            title="Selección múltiple por toque"
            {...compactTipProps('Selección múltiple')}
            className={buttonClass(multiSelectTouch)}
          >
            <Layers className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Selección múltiple</span>}
          </button>

          <div
            className={
              isCompact ? 'flex flex-col gap-1' : 'grid grid-cols-2 gap-1'
            }
          >
            <button
              type="button"
              data-testid="sidebar-select-all"
              disabled={workMode === 'edit' && !canEditSelected}
              onClick={onSelectAll}
              aria-label="Seleccionar todo (A)"
              title="Seleccionar todo (A)"
              {...compactTipProps('Seleccionar todo (A)')}
              className={buttonClass(
                false,
                workMode === 'edit' && !canEditSelected,
              )}
            >
              <CheckSquare className="w-4 h-4 shrink-0" />
              {!isCompact && <span className="truncate">Todo</span>}
            </button>

            <button
              type="button"
              data-testid="sidebar-deselect-all"
              disabled={
                workMode === 'edit' ? !hasSelectedComponents : !hasSelectedObject
              }
              onClick={onDeselectAll}
              aria-label="Limpiar selección (Alt+A)"
              title="Limpiar selección (Alt+A)"
              {...compactTipProps('Limpiar selección (Alt+A)')}
              className={buttonClass(
                false,
                workMode === 'edit' ? !hasSelectedComponents : !hasSelectedObject,
              )}
            >
              <X className="w-4 h-4 shrink-0" />
              {!isCompact && <span className="truncate">Limpiar</span>}
            </button>
          </div>

          {workMode === 'edit' && (
            <button
              type="button"
              data-testid="sidebar-select-connected"
              disabled={!canEditSelected || !hasSelectedComponents}
              onClick={onSelectConnected}
              aria-label="Seleccionar componentes conectados (Isla / L)"
              title="Seleccionar componentes conectados (Isla / L)"
              {...compactTipProps('Seleccionar conectados (L)')}
              className={buttonClass(
                false,
                !canEditSelected || !hasSelectedComponents,
              )}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              {!isCompact && <span className="truncate">Selec. conectados</span>}
            </button>
          )}
        </>
      ),
    },

    transform: {
      id: 'transform',
      label: 'Transformación',
      icon: <Move className="w-3.5 h-3.5 text-[#5ecd6e] shrink-0" />,
      visible: true,
      renderBody: () => (
        <>
          {transformItems.map((item) => {
            const isActive = activeTool === item.id && !activeOperatorType;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`sidebar-tool-${item.id}`}
                disabled={!hasSelectedObject}
                onClick={() => onSelectTool(item.id)}
                title={item.title}
                aria-label={item.title}
                aria-pressed={isActive}
                {...compactTipProps(item.title)}
                className={buttonClass(isActive, !hasSelectedObject)}
              >
                {item.icon}
                {!isCompact && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          {activeTool === 'move' && (
            <div
              data-testid="sidebar-move-submodes"
              className={`${
                isCompact ? 'flex flex-col gap-1' : 'grid grid-cols-3 gap-1'
              } p-1 rounded-lg bg-[#121419] border border-[#282c36]`}
            >
              {(
                [
                  {
                    id: 'free',
                    label: 'Free',
                    title: 'Movimiento libre',
                    icon: <Move className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'axis',
                    label: 'Axis',
                    title: 'Restringido a eje X/Y/Z',
                    icon: <Crosshair className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'slide',
                    label: 'Slide',
                    title: 'Deslizar sobre topología',
                    icon: <Waypoints className="w-3.5 h-3.5" />,
                  },
                ] as const
              ).map((sub) => {
                const isActive = moveSubMode === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    data-testid={`move-submode-${sub.id}`}
                    aria-pressed={isActive}
                    aria-label={sub.title}
                    title={sub.title}
                    onClick={() => onSelectMoveSubMode(sub.id)}
                    {...compactTipProps(sub.title)}
                    className={`${
                      isCompact ? 'h-7 flex items-center justify-center' : 'h-8'
                    } rounded text-[11px] font-semibold transition-colors touch-manipulation ${
                      isActive
                        ? sub.id === 'slide'
                          ? 'bg-[#22d3ee] text-[#0f1115]'
                          : 'bg-[#5ecd6e] text-[#111215]'
                        : 'bg-[#1e2129] hover:bg-[#2a2f3a] text-[#cbd5e1] hover:text-white'
                    }`}
                  >
                    {isCompact ? sub.icon : sub.label}
                  </button>
                );
              })}
            </div>
          )}

          <div
            className={`${
              isCompact ? 'grid grid-cols-2 gap-1' : 'grid grid-cols-4 gap-1'
            } p-1 rounded-lg bg-[#121419] border border-[#282c36]`}
            aria-label="Restricción de eje"
          >
            {(
              [
                {
                  id: 'free',
                  label: 'Libre',
                  short: 'L',
                  title: 'Movimiento libre',
                  active: 'bg-[#5ecd6e] text-[#111215]',
                },
                {
                  id: 'x',
                  label: 'X',
                  short: 'X',
                  title: 'Restringir al eje X',
                  active: 'bg-[#e05252] text-white',
                },
                {
                  id: 'y',
                  label: 'Y',
                  short: 'Y',
                  title: 'Restringir al eje Y',
                  active: 'bg-[#52b852] text-white',
                },
                {
                  id: 'z',
                  label: 'Z',
                  short: 'Z',
                  title: 'Restringir al eje Z',
                  active: 'bg-[#48bce8] text-[#111215]',
                },
              ] as const
            ).map((ax) => (
              <button
                key={ax.id}
                type="button"
                data-testid={`sidebar-axis-${ax.id}`}
                aria-pressed={axisConstraint === ax.id}
                aria-label={ax.title}
                title={ax.title}
                onClick={() => onChangeAxisConstraint(ax.id)}
                {...compactTipProps(ax.title)}
                className={`${
                  isCompact ? 'h-7' : 'h-8'
                } rounded text-[11px] font-bold transition-colors touch-manipulation ${
                  axisConstraint === ax.id
                    ? ax.active
                    : 'bg-[#1e2129] hover:bg-[#2a2f3a] text-[#b4bac4] hover:text-white'
                }`}
              >
                {isCompact ? ax.short : ax.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            data-testid="sidebar-g-modal"
            disabled={!hasSelectedObject}
            onPointerDown={handleGPointerDown}
            onPointerUp={handleGPointerUp}
            onPointerCancel={handleGPointerCancel}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Mover G / Deslizar (Toque rápido o mantener 0.4s)"
            title="Toque rápido: Mover modal (G) · Mantener 0.4s: Vertex/Edge Slide"
            {...compactTipProps('Mover G / Slide')}
            className={buttonClass(
              modalTransformMode !== null,
              !hasSelectedObject,
            )}
          >
            <span className="w-4 h-4 rounded bg-[#14161b]/50 border border-current/30 text-[10px] font-bold flex items-center justify-center shrink-0">
              G
            </span>
            {!isCompact && (
              <span className="truncate">
                {modalTransformMode === 'vertex_slide' ||
                modalTransformMode === 'edge_slide'
                  ? 'Slide activo'
                  : 'Mover G / Slide'}
              </span>
            )}
          </button>
        </>
      ),
    },

    selectionModes: {
      id: 'selectionModes',
      label: 'Modos de selección',
      icon: <Box className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />,
      visible: workMode === 'edit',
      renderBody: () => (
        <>
          <div
            className={
              isCompact ? 'flex flex-col gap-1' : 'grid grid-cols-3 gap-1'
            }
          >
            {(
              [
                {
                  id: 'vertex',
                  label: 'Vért.',
                  title: 'Modo Vértices',
                  icon: (
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
                      <circle cx="8" cy="8" r="3.4" fill="currentColor" />
                    </svg>
                  ),
                },
                {
                  id: 'edge',
                  label: 'Arista',
                  title: 'Modo Aristas',
                  icon: (
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      className="w-3.5 h-3.5 shrink-0"
                      aria-hidden="true"
                    >
                      <line x1="3" y1="13" x2="13" y2="3" />
                    </svg>
                  ),
                },
                {
                  id: 'face',
                  label: 'Cara',
                  title: 'Modo Caras',
                  icon: (
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="w-3.5 h-3.5 shrink-0"
                      aria-hidden="true"
                    >
                      <rect
                        x="3.2"
                        y="3.2"
                        width="9.6"
                        height="9.6"
                        rx="1.2"
                        fill="currentColor"
                        fillOpacity="0.28"
                      />
                    </svg>
                  ),
                },
              ] as const
            ).map((comp) => {
              const active = editSelectionMode === comp.id;
              return (
                <button
                  key={comp.id}
                  type="button"
                  data-testid={`component-mode-${comp.id}`}
                  aria-pressed={active}
                  aria-label={comp.title}
                  title={comp.title}
                  onClick={() => onChangeEditSelectionMode(comp.id)}
                  {...compactTipProps(comp.title)}
                  className={`${
                    isCompact ? 'min-h-[36px]' : 'min-h-[38px]'
                  } rounded-lg border flex items-center justify-center gap-1 text-[11px] font-semibold transition-colors touch-manipulation ${
                    active
                      ? 'bg-[#5ecd6e] border-[#7def8e] text-[#111215]'
                      : 'bg-[#20232b] hover:bg-[#2a2f3a] border-[#2e3340] text-[#d1d5db] hover:text-white'
                  }`}
                >
                  {comp.icon}
                  {!isCompact && <span>{comp.label}</span>}
                </button>
              );
            })}
          </div>

          {editSelectionMode === 'edge' && (
            <div
              className={`${
                isCompact ? 'flex flex-col gap-1' : 'grid grid-cols-3 gap-1'
              } p-1 rounded-lg bg-[#121419] border border-[#282c36]`}
              title="Modo de selección de aristas al tocar"
            >
              {(
                [
                  {
                    id: 'single',
                    label: 'Arista',
                    title: 'Selección individual de arista',
                    icon: (
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5" aria-hidden="true">
                        <line x1="3" y1="8" x2="13" y2="8" />
                      </svg>
                    ),
                  },
                  {
                    id: 'loop',
                    label: 'Bucle',
                    title: 'Selección de bucle (Edge Loop)',
                    icon: (
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5" aria-hidden="true">
                        <circle cx="8" cy="8" r="4.5" />
                      </svg>
                    ),
                  },
                  {
                    id: 'ring',
                    label: 'Anillo',
                    title: 'Selección de anillo (Edge Ring)',
                    icon: (
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5" aria-hidden="true">
                        <line x1="4" y1="4" x2="4" y2="12" />
                        <line x1="8" y1="4" x2="8" y2="12" />
                        <line x1="12" y1="4" x2="12" y2="12" />
                      </svg>
                    ),
                  },
                ] as const
              ).map((toolOpt) => (
                <button
                  key={toolOpt.id}
                  type="button"
                  data-testid={`edge-select-tool-${toolOpt.id}`}
                  aria-pressed={edgeSelectionTool === toolOpt.id}
                  aria-label={toolOpt.title}
                  title={toolOpt.title}
                  onClick={() => onChangeEdgeSelectionTool(toolOpt.id)}
                  {...compactTipProps(toolOpt.title)}
                  className={`${
                    isCompact ? 'h-7 flex items-center justify-center' : 'h-8'
                  } rounded text-[11px] font-semibold transition-colors touch-manipulation ${
                    edgeSelectionTool === toolOpt.id
                      ? 'bg-[#1a2c3d] border border-[#38bdf8]/70 text-[#38bdf8]'
                      : 'bg-[#1e2129] hover:bg-[#2a2f3a] text-[#b4bac4] hover:text-white'
                  }`}
                >
                  {isCompact ? toolOpt.icon : toolOpt.label}
                </button>
              ))}
            </div>
          )}
        </>
      ),
    },

    modifiers: {
      id: 'modifiers',
      label: 'Modificadores',
      icon: <Sliders className="w-3.5 h-3.5 text-[#a78bfa] shrink-0" />,
      badge: anyModifierActive ? (
        <span className="w-2 h-2 rounded-full bg-[#5ecd6e] shrink-0" />
      ) : null,
      visible: touchSettings.modifierPanelEnabled && visibleModifierKeys.length > 0,
      renderBody: () => (
        <>
          <div
            className={
              isCompact ? 'flex flex-col gap-1' : 'grid grid-cols-3 gap-1'
            }
          >
            {visibleModifierKeys.map((key) => {
              const active = effectiveModifiers[key];
              const latched = screenModifiers[key];
              const label = key.toUpperCase();
              const compactSymbol =
                key === 'shift' ? '⇧' : key === 'ctrl' ? '⌃' : '⌥';
              const activeStyle =
                key === 'shift'
                  ? 'bg-[#16261a] border-[#5ecd6e] text-[#7def8e]'
                  : key === 'ctrl'
                    ? 'bg-[#112738] border-[#38bdf8] text-[#7dd3fc]'
                    : 'bg-[#221a35] border-[#a78bfa] text-[#ddd6fe]';
              return (
                <button
                  key={key}
                  type="button"
                  data-testid={`modifier-btn-${key}`}
                  aria-pressed={active}
                  aria-label={label}
                  title={`${label} (${isHoldMode ? 'Mantener pulsado' : 'Tocar para activar/desactivar'})`}
                  {...compactTipProps(label)}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (isHoldMode) {
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch {
                        // ignore
                      }
                      onSetModifier(key, true);
                    }
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (isHoldMode) onSetModifier(key, false);
                  }}
                  onPointerCancel={(e) => {
                    e.stopPropagation();
                    if (isHoldMode) onSetModifier(key, false);
                  }}
                  onClick={() => {
                    if (!isHoldMode) onToggleModifier(key);
                  }}
                  className={`${
                    isCompact ? 'min-h-[34px] text-xs' : 'min-h-[38px] text-[11px]'
                  } rounded-lg border font-bold tracking-wide transition-colors touch-manipulation flex items-center justify-center ${
                    active
                      ? activeStyle
                      : 'bg-[#20232b] hover:bg-[#2a2f3a] border-[#2e3340] text-[#cbd5e1]'
                  } ${latched ? 'ring-1 ring-white/25' : ''}`}
                >
                  {isCompact ? compactSymbol : label}
                </button>
              );
            })}
          </div>
          {anyModifierActive && (
            <button
              type="button"
              data-testid="modifiers-release-all"
              onClick={onReleaseAllModifiers}
              aria-label="Soltar modificadores"
              title="Soltar modificadores"
              {...compactTipProps('Soltar modificadores')}
              className="h-7 rounded-md bg-[#22252e] hover:bg-[#2d323e] border border-[#343947] text-[10px] font-semibold text-[#cbd5e1] flex items-center justify-center gap-1"
            >
              <X className="w-3 h-3 text-[#5ecd6e]" />
              {!isCompact && <span>Soltar modificadores</span>}
            </button>
          )}
        </>
      ),
    },

    modeling: {
      id: 'modeling',
      label: 'Modelado',
      icon: <FlipHorizontal className="w-3.5 h-3.5 text-[#5ecd6e] shrink-0" />,
      visible: workMode === 'edit',
      renderBody: () => (
        <>
          {modelingItems.map((op) => {
            const isActive = activeOperatorType === op.id;
            const requiresSelection = op.id !== 'loop_cut';
            const disabled =
              !canEditSelected || (requiresSelection && !hasSelectedComponents);
            return (
              <button
                key={op.id}
                type="button"
                data-testid={`sidebar-op-${op.id}`}
                disabled={!canEditSelected}
                onClick={() => onStartOperator(op.id)}
                title={
                  disabled && canEditSelected
                    ? `${op.title} (requiere selección)`
                    : op.title
                }
                aria-label={op.title}
                aria-pressed={isActive}
                {...compactTipProps(op.title)}
                className={buttonClass(isActive, !canEditSelected)}
              >
                {op.icon}
                {!isCompact && <span className="truncate">{op.label}</span>}
              </button>
            );
          })}
        </>
      ),
    },

    geometryEdit: {
      id: 'geometryEdit',
      label: 'Edición de geometría',
      icon: <GitMerge className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />,
      visible: workMode === 'edit',
      renderBody: () => (
        <>
          <button
            type="button"
            data-testid="sidebar-topo-merge"
            disabled={!canEditSelected}
            onClick={() => onStartOperator('merge')}
            aria-label="Fusionar vértices seleccionados (M)"
            title="Fusionar vértices seleccionados (M)"
            aria-pressed={activeOperatorType === 'merge'}
            {...compactTipProps('Fusionar (M)')}
            className={buttonClass(
              activeOperatorType === 'merge',
              !canEditSelected,
            )}
          >
            <GitMerge className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Fusionar</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-topo-merge-distance"
            disabled={!canEditSelected}
            onClick={() => onStartOperator('merge_by_distance')}
            aria-label="Fusionar vértices por distancia"
            title="Fusionar vértices por distancia"
            aria-pressed={activeOperatorType === 'merge_by_distance'}
            {...compactTipProps('Fusionar por distancia')}
            className={buttonClass(
              activeOperatorType === 'merge_by_distance',
              !canEditSelected,
            )}
          >
            <Minimize2 className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Por distancia</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-topo-bridge"
            disabled={!canEditSelected}
            onClick={() => onStartOperator('bridge_loops')}
            aria-label="Bridge Edge Loops"
            title="Bridge Edge Loops"
            aria-pressed={activeOperatorType === 'bridge_loops'}
            {...compactTipProps('Bridge Edge Loops')}
            className={buttonClass(
              activeOperatorType === 'bridge_loops',
              !canEditSelected,
            )}
          >
            <Link2 className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Bridge Loops</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-topo-dissolve-limited"
            disabled={!canEditSelected}
            onClick={() => onStartOperator('dissolve_limited')}
            aria-label="Limitar disolución por ángulo"
            title="Limitar disolución por ángulo"
            aria-pressed={activeOperatorType === 'dissolve_limited'}
            {...compactTipProps('Limitar disolución')}
            className={buttonClass(
              activeOperatorType === 'dissolve_limited',
              !canEditSelected,
            )}
          >
            <ScissorsLineDashed className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Limitar disolución</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-topo-fill"
            disabled={!canEditSelected || !hasSelectedComponents}
            onClick={onFillSelection}
            aria-label="Crear cara (F)"
            title="Crear cara (F)"
            {...compactTipProps('Crear cara (F)')}
            className={buttonClass(
              false,
              !canEditSelected || !hasSelectedComponents,
            )}
          >
            <PaintBucket className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Crear cara</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-topo-connect"
            disabled={
              !canEditSelected ||
              editSelectionMode !== 'vertex' ||
              !hasSelectedComponents
            }
            onClick={onConnectVertexPath}
            aria-label="Conectar vértices (J)"
            title="Conectar vértices (J)"
            {...compactTipProps('Conectar vértices (J)')}
            className={buttonClass(
              false,
              !canEditSelected ||
                editSelectionMode !== 'vertex' ||
                !hasSelectedComponents,
            )}
          >
            <Waypoints className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Conectar vértices</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-topo-delete"
            disabled={!canEditSelected || !hasSelectedComponents}
            onClick={() => {
              setShowPrimitivePopover(false);
              setShowDeletePopover((prev) => !prev);
            }}
            aria-label="Opciones de eliminar / disolver selección"
            title="Opciones de eliminar / disolver selección"
            aria-expanded={showDeletePopover}
            {...compactTipProps('Eliminar / Disolver...')}
            className={buttonClass(
              showDeletePopover,
              !canEditSelected || !hasSelectedComponents,
              true,
            )}
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Eliminar...</span>}
          </button>
        </>
      ),
    },

    uvSeams: {
      id: 'uvSeams',
      label: 'Costuras UV',
      icon: <Scissors className="w-3.5 h-3.5 text-[#f472b6] shrink-0" />,
      badge:
        seamCount > 0 ? (
          <span className="px-1 py-0.2 rounded bg-[#361729] text-[#f9a8d4] font-mono-tabular text-[9px] shrink-0">
            {seamCount}
          </span>
        ) : null,
      visible: workMode === 'edit',
      renderBody: () => (
        <div
          className={
            isCompact ? 'flex flex-col gap-1' : 'grid grid-cols-2 gap-1'
          }
        >
          <button
            type="button"
            data-testid="sidebar-mark-seam"
            disabled={!canEditSelected || !hasSelectedComponents || !onMarkSeams}
            onClick={() => onMarkSeams?.(true)}
            aria-label="Marcar las aristas de la selección como costura UV (Mark Seam)"
            title="Marcar las aristas de la selección como costura UV (Mark Seam)"
            {...compactTipProps('Mark Seam')}
            className={buttonClass(
              false,
              !canEditSelected || !hasSelectedComponents || !onMarkSeams,
            )}
          >
            <Scissors className="w-3.5 h-3.5 shrink-0 text-[#f472b6]" />
            {!isCompact && <span className="truncate">Mark Seam</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-clear-seam"
            disabled={!canEditSelected || !hasSelectedComponents || !onMarkSeams}
            onClick={() => onMarkSeams?.(false)}
            aria-label="Quitar costuras UV de la selección (Clear Seam)"
            title="Quitar costuras UV de la selección (Clear Seam)"
            {...compactTipProps('Clear Seam')}
            className={buttonClass(
              false,
              !canEditSelected || !hasSelectedComponents || !onMarkSeams,
            )}
          >
            <X className="w-3.5 h-3.5 shrink-0 text-[#fca5a5]" />
            {!isCompact && <span className="truncate">Clear Seam</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-select-seams"
            disabled={!canEditSelected || seamCount === 0 || !onSelectSeams}
            onClick={() => onSelectSeams?.()}
            aria-label="Seleccionar todas las costuras UV del objeto (Select Seams)"
            title="Seleccionar todas las costuras UV del objeto (Select Seams)"
            {...compactTipProps('Select Seams')}
            className={buttonClass(
              false,
              !canEditSelected || seamCount === 0 || !onSelectSeams,
            )}
          >
            <CheckSquare className="w-3.5 h-3.5 shrink-0 text-[#f472b6]" />
            {!isCompact && <span className="truncate">Select Seams</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-deselect-seams"
            disabled={!canEditSelected || seamCount === 0 || !onDeselectSeams}
            onClick={() => onDeselectSeams?.()}
            aria-label="Deseleccionar aristas marcadas como costura UV (Deselect Seams)"
            title="Deseleccionar aristas marcadas como costura UV (Deselect Seams)"
            {...compactTipProps('Deselect Seams')}
            className={buttonClass(
              false,
              !canEditSelected || seamCount === 0 || !onDeselectSeams,
            )}
          >
            <ScissorsLineDashed className="w-3.5 h-3.5 shrink-0 text-[#9ca3af]" />
            {!isCompact && <span className="truncate">Deselect Seams</span>}
          </button>
        </div>
      ),
    },

    normalsDisplay: {
      id: 'normalsDisplay',
      label: 'Normales y visual.',
      icon: <Eye className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />,
      visible: true,
      renderBody: () => (
        <>
          <button
            type="button"
            data-testid="sidebar-face-orientation"
            onClick={onToggleFaceOrientation}
            aria-pressed={showFaceOrientation}
            aria-label="Face Orientation"
            title="Face Orientation (Azul: exterior · Rojo: invertida)"
            {...compactTipProps('Face Orientation')}
            className={buttonClass(showFaceOrientation)}
          >
            <span
              className="inline-flex w-3.5 h-3.5 rounded-sm overflow-hidden border border-white/25 shrink-0"
              aria-hidden="true"
            >
              <span className="w-1/2 h-full bg-[#2563eb]" />
              <span className="w-1/2 h-full bg-[#e03131]" />
            </span>
            {!isCompact && <span className="truncate">Face Orientation</span>}
          </button>

          {workMode === 'edit' && (
            <>
              <button
                type="button"
                data-testid="sidebar-recalc-outside"
                disabled={!canEditSelected}
                onClick={onRecalculateOutside}
                aria-label="Recalculate Outside"
                title="Recalculate Outside"
                {...compactTipProps('Recalculate Outside')}
                className={buttonClass(false, !canEditSelected)}
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                {!isCompact && (
                  <span className="truncate">Recalculate Outside</span>
                )}
              </button>

              <button
                type="button"
                data-testid="sidebar-flip-normals"
                disabled={!canEditSelected}
                onClick={onFlipNormals}
                aria-label="Flip Normals"
                title="Flip Normals"
                {...compactTipProps('Flip Normals')}
                className={buttonClass(false, !canEditSelected)}
              >
                <ArrowUpDown className="w-4 h-4 shrink-0" />
                {!isCompact && <span className="truncate">Flip Normals</span>}
              </button>
            </>
          )}

          <button
            type="button"
            data-testid="sidebar-toggle-xray"
            onClick={onToggleXray}
            aria-pressed={xrayEditMode}
            aria-label="Alternar Rayos X (Alt+Z)"
            title="Alternar Rayos X (Alt+Z)"
            {...compactTipProps('Rayos X (Alt+Z)')}
            className={buttonClass(xrayEditMode)}
          >
            <Eye className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Rayos X</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-toggle-grid"
            onClick={onToggleGrid}
            aria-pressed={showGrid}
            aria-label="Mostrar u ocultar cuadrícula 3D"
            title="Mostrar u ocultar cuadrícula 3D"
            {...compactTipProps('Cuadrícula 3D')}
            className={buttonClass(showGrid)}
          >
            <Grid className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Cuadrícula</span>}
          </button>
        </>
      ),
    },

    proportional: {
      id: 'proportional',
      label: 'Ed. proporcional',
      icon: <ProportionalIcon className="w-3.5 h-3.5 text-[#5ecd6e] shrink-0" />,
      badge: proportionalConfig.enabled ? (
        <span className="px-1 py-0.2 rounded bg-[#16261a] text-[#6fe681] text-[9px] font-mono-tabular shrink-0">
          ON
        </span>
      ) : null,
      visible: true,
      renderBody: () => (
        <>
          <button
            type="button"
            data-testid="proportional-toggle-btn"
            onClick={onToggleProportional}
            aria-pressed={proportionalConfig.enabled}
            aria-label="Activar/Desactivar Edición Proporcional (O)"
            title="Activar/Desactivar Edición Proporcional (O)"
            {...compactTipProps(
              proportionalConfig.enabled
                ? 'Edición Proporcional ON (O)'
                : 'Edición Proporcional OFF (O)',
            )}
            className={buttonClass(proportionalConfig.enabled)}
          >
            <ProportionalIcon className="w-4 h-4 shrink-0" />
            {!isCompact && (
              <span className="truncate">
                {proportionalConfig.enabled ? 'Activada (O)' : 'Activar (O)'}
              </span>
            )}
          </button>

          <button
            type="button"
            data-testid="proportional-connected-btn"
            disabled={!proportionalConfig.enabled}
            onClick={onToggleProportionalConnected}
            aria-pressed={proportionalConfig.connectedOnly}
            aria-label="Solo vértices conectados topológicamente (Alt+O)"
            title="Solo vértices conectados topológicamente (Alt+O)"
            {...compactTipProps('Solo conectados (Alt+O)')}
            className={buttonClass(
              proportionalConfig.connectedOnly && proportionalConfig.enabled,
              !proportionalConfig.enabled,
            )}
          >
            <Link2 className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Solo conectados</span>}
          </button>

          <div className="rounded-lg bg-[#121419] border border-[#282c36] p-1 space-y-1">
            {!isCompact && (
              <div className="text-[10px] font-semibold text-[#8a93a4] px-0.5">
                Curva de caída (Shift+O)
              </div>
            )}
            <div className="grid grid-cols-2 gap-1">
              {PROPORTIONAL_FALLOFF_LIST.map((item) => {
                const active = proportionalConfig.falloff === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!proportionalConfig.enabled}
                    onClick={() => onChangeProportionalFalloff(item.id)}
                    aria-label={`Curva ${item.label}`}
                    title={`Curva: ${item.label}`}
                    {...compactTipProps(`Curva: ${item.label}`)}
                    className={`${
                      isCompact
                        ? 'h-7 justify-center px-0'
                        : 'h-8 px-1.5 gap-1'
                    } rounded text-[10px] font-semibold flex items-center transition-colors disabled:opacity-40 ${
                      active
                        ? 'bg-[#2c313b] border border-[#5ecd6e]/70 text-[#7def8e]'
                        : 'bg-[#1e2129] hover:bg-[#2a2f3a] border border-transparent text-[#cbd5e1]'
                    }`}
                  >
                    <FalloffCurveIcon
                      falloff={item.id}
                      className="w-3.5 h-3.5 shrink-0"
                    />
                    {!isCompact && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg bg-[#121419] border border-[#282c36] p-1.5 space-y-1">
            {isCompact ? (
              <div
                className="text-[10px] font-mono-tabular font-bold text-[#5ecd6e] text-center"
                title={`Radio proporcional: ${radiusText}`}
              >
                {radiusText}
              </div>
            ) : (
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-[#8a93a4]">
                  Radio [ / ]
                </span>
                <span className="font-mono-tabular font-bold text-[#5ecd6e]">
                  {radiusText}
                </span>
              </div>
            )}
            <div
              className={
                isCompact ? 'grid grid-cols-2 gap-1' : 'flex items-center gap-1'
              }
            >
              <button
                type="button"
                disabled={!proportionalConfig.enabled}
                onClick={() =>
                  onChangeProportionalRadius(proportionalConfig.radius * 0.9)
                }
                aria-label="Reducir radio proporcional"
                title="Reducir radio proporcional ([)"
                {...compactTipProps('Reducir radio ([)')}
                className={`${
                  isCompact ? 'h-7 w-full' : 'w-8 h-8'
                } rounded bg-[#20232b] hover:bg-[#2a2f3a] border border-[#2e3340] text-xs font-bold text-[#e4e6eb] disabled:opacity-40`}
              >
                −
              </button>
              {!isCompact && (
                <input
                  type="range"
                  min={0.05}
                  max={6}
                  step={0.05}
                  disabled={!proportionalConfig.enabled}
                  value={Math.min(6, proportionalConfig.radius)}
                  onChange={(e) =>
                    onChangeProportionalRadius(
                      clampProportionalRadius(parseFloat(e.target.value)),
                    )
                  }
                  className="flex-1 min-w-0 accent-[#5ecd6e] cursor-pointer disabled:opacity-40"
                />
              )}
              <button
                type="button"
                disabled={!proportionalConfig.enabled}
                onClick={() =>
                  onChangeProportionalRadius(proportionalConfig.radius * 1.1)
                }
                aria-label="Aumentar radio proporcional"
                title="Aumentar radio proporcional (])"
                {...compactTipProps('Aumentar radio (])')}
                className={`${
                  isCompact ? 'h-7 w-full' : 'w-8 h-8'
                } rounded bg-[#20232b] hover:bg-[#2a2f3a] border border-[#2e3340] text-xs font-bold text-[#e4e6eb] disabled:opacity-40`}
              >
                +
              </button>
            </div>
          </div>

          {!isCompact && proportionalModifierWarning && proportionalConfig.enabled && (
            <div className="px-2 py-1.5 rounded bg-[#261c0f] border border-[#f59e0b]/45 text-[10px] text-[#fcd34d] leading-snug">
              {proportionalModifierWarning}
            </div>
          )}
        </>
      ),
    },

    additional: {
      id: 'additional',
      label: 'Herramientas adic.',
      icon: <Wrench className="w-3.5 h-3.5 text-[#5ecd6e] shrink-0" />,
      visible: true,
      renderBody: () => (
        <>
          <button
            type="button"
            data-testid="sidebar-toggle-workmode"
            disabled={!canEditSelected && workMode === 'object'}
            onClick={() =>
              onToggleWorkMode(workMode === 'object' ? 'edit' : 'object')
            }
            aria-label="Cambiar entre Modo Objeto y Modo Edición (Tab)"
            title="Cambiar entre Modo Objeto y Modo Edición (Tab)"
            {...compactTipProps(
              workMode === 'edit' ? 'Ir a Objeto (Tab)' : 'Ir a Edición (Tab)',
            )}
            className={buttonClass(
              workMode === 'edit',
              !canEditSelected && workMode === 'object',
            )}
          >
            <Hand className="w-4 h-4 shrink-0" />
            {!isCompact && (
              <span className="truncate">
                {workMode === 'edit' ? 'Ir a Objeto' : 'Ir a Edición'}
              </span>
            )}
          </button>

          {workMode === 'object' && (
            <button
              type="button"
              data-testid="sidebar-add-primitive"
              onClick={() => {
                setShowDeletePopover(false);
                setShowPrimitivePopover((prev) => !prev);
              }}
              aria-expanded={showPrimitivePopover}
              aria-label="Agregar primitiva 3D a la escena"
              title="Agregar primitiva 3D a la escena"
              {...compactTipProps('Agregar objeto 3D')}
              className={buttonClass(showPrimitivePopover)}
            >
              <Plus className="w-4 h-4 shrink-0" />
              {!isCompact && <span className="truncate">Agregar objeto</span>}
            </button>
          )}

          <button
            type="button"
            data-testid="sidebar-duplicate-object"
            disabled={!hasSelectedObject}
            onClick={onDuplicateObject}
            aria-label="Duplicar objeto seleccionado"
            title="Duplicar objeto seleccionado"
            {...compactTipProps('Duplicar objeto')}
            className={buttonClass(false, !hasSelectedObject)}
          >
            <Copy className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Duplicar</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-apply-transform"
            disabled={!canEditSelected}
            onClick={onApplyObjectTransform}
            aria-label="Aplicar transformaciones a la malla"
            title="Aplicar transformaciones a la malla"
            {...compactTipProps('Aplicar transformación')}
            className={buttonClass(false, !canEditSelected)}
          >
            <Box className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Aplicar transf.</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-center-origin"
            disabled={!canEditSelected}
            onClick={onCenterObjectOrigin}
            aria-label="Centrar origen al centro geométrico"
            title="Centrar origen al centro geométrico"
            {...compactTipProps('Centrar origen')}
            className={buttonClass(false, !canEditSelected)}
          >
            <Crosshair className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Centrar origen</span>}
          </button>

          {workMode === 'edit' && (
            <button
              type="button"
              data-testid="sidebar-separate-geometry"
              disabled={!canEditSelected || !hasSelectedComponents}
              onClick={onSeparateSelectedGeometry}
              aria-label="Separar selección como nuevo objeto"
              title="Separar selección como nuevo objeto"
              {...compactTipProps('Separar selección')}
              className={buttonClass(
                false,
                !canEditSelected || !hasSelectedComponents,
              )}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              {!isCompact && <span className="truncate">Separar selección</span>}
            </button>
          )}

          <button
            type="button"
            data-testid="sidebar-focus-camera"
            onClick={onFocusCamera}
            aria-label="Encuadrar objeto seleccionado (F / Inicio)"
            title="Encuadrar objeto seleccionado (F / Inicio)"
            {...compactTipProps('Encuadrar vista')}
            className={buttonClass(false)}
          >
            <Focus className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="truncate">Encuadrar vista</span>}
          </button>

          <button
            type="button"
            data-testid="sidebar-open-tool-settings"
            onClick={onOpenToolSettings}
            aria-label="Abrir Configuración de herramientas"
            title="Abrir Configuración de herramientas"
            {...compactTipProps('Config. herramientas')}
            className={buttonClass(false)}
          >
            <Wrench className="w-4 h-4 shrink-0 text-[#5ecd6e]" />
            {!isCompact && <span className="truncate">Config. herramientas</span>}
          </button>
        </>
      ),
    },
  };

  const visibleModules = useMemo(
    () =>
      moduleOrder
        .map((id) => moduleDescriptors[id])
        .filter((mod) => mod && mod.visible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      moduleOrder,
      workMode,
      editSelectionMode,
      edgeSelectionTool,
      activeTool,
      moveSubMode,
      axisConstraint,
      activeOperatorType,
      modalTransformMode,
      canEditSelected,
      hasSelectedObject,
      hasSelectedComponents,
      multiSelectTouch,
      xrayEditMode,
      showFaceOrientation,
      showGrid,
      proportionalConfig,
      proportionalModifierWarning,
      touchSettings,
      effectiveModifiers,
      screenModifiers,
      seamCount,
      showPrimitivePopover,
      showDeletePopover,
      isCompact,
    ],
  );

  const visibleModuleIds = useMemo(
    () => visibleModules.map((m) => m.id),
    [visibleModules],
  );

  const computeTargetVisibleSlot = useCallback(
    (pointerY: number): number => {
      for (let i = 0; i < visibleModuleIds.length; i++) {
        const el = moduleCardRefs.current.get(visibleModuleIds[i]);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const midY = rect.top + rect.height * 0.5;
        if (pointerY < midY) return i;
      }
      return visibleModuleIds.length;
    },
    [visibleModuleIds],
  );

  const cancelDragState = useCallback(() => {
    if (pendingDragRef.current?.timerId !== null && pendingDragRef.current) {
      window.clearTimeout(pendingDragRef.current.timerId);
    }
    pendingDragRef.current = null;
    setPendingDragId(null);
    setActiveDrag(null);
  }, []);

  const activatePendingDrag = useCallback(
    (currentY: number) => {
      const pending = pendingDragRef.current;
      if (!pending) return;
      if (pending.timerId !== null) {
        window.clearTimeout(pending.timerId);
        pending.timerId = null;
      }
      const nextActive: ActiveDragState = {
        id: pending.id,
        label: pending.label,
        pointerId: pending.pointerId,
        pointerY: currentY,
        grabOffsetY: pending.grabOffsetY,
        cardLeft: pending.cardLeft,
        cardWidth: pending.cardWidth,
        targetVisibleSlot: computeTargetVisibleSlot(currentY),
      };
      pendingDragRef.current = null;
      setPendingDragId(null);
      setActiveDrag(nextActive);
    },
    [computeTargetVisibleSlot],
  );

  // Global pointer tracking for clean mouse + tablet touch module drag-and-drop
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const pending = pendingDragRef.current;
      if (pending && e.pointerId === pending.pointerId) {
        const dist = Math.hypot(
          e.clientX - pending.startX,
          e.clientY - pending.startY,
        );
        if (pending.pointerType === 'touch' || pending.pointerType === 'pen') {
          if (dist > 10) {
            cancelDragState();
          }
        } else if (dist >= 4) {
          activatePendingDrag(e.clientY);
        }
        return;
      }

      const active = activeDragRef.current;
      if (active && e.pointerId === active.pointerId) {
        e.preventDefault();
        const nextSlot = computeTargetVisibleSlot(e.clientY);
        setActiveDrag((prev) =>
          prev && prev.pointerId === e.pointerId
            ? { ...prev, pointerY: e.clientY, targetVisibleSlot: nextSlot }
            : prev,
        );
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const pending = pendingDragRef.current;
      if (pending && e.pointerId === pending.pointerId) {
        cancelDragState();
        return;
      }

      const active = activeDragRef.current;
      if (active && e.pointerId === active.pointerId) {
        const finalSlot = computeTargetVisibleSlot(e.clientY);
        const reordered = reorderSidebarModules(
          moduleOrder,
          visibleModuleIds,
          active.id,
          finalSlot,
        );
        if (reordered !== moduleOrder) {
          onReorderModules(reordered);
        }
        cancelDragState();
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (
        pendingDragRef.current?.pointerId === e.pointerId ||
        activeDragRef.current?.pointerId === e.pointerId
      ) {
        cancelDragState();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (activeDragRef.current || pendingDragRef.current)) {
        cancelDragState();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    activatePendingDrag,
    cancelDragState,
    computeTargetVisibleSlot,
    moduleOrder,
    onReorderModules,
    visibleModuleIds,
  ]);

  // Auto-scroll sidebar when dragging near top or bottom edge
  useEffect(() => {
    if (!activeDrag) return;
    let rafId = 0;
    const stepScroll = () => {
      const container = scrollContainerRef.current;
      const current = activeDragRef.current;
      if (container && current) {
        const rect = container.getBoundingClientRect();
        let delta = 0;
        if (current.pointerY < rect.top + 38) {
          delta = -Math.min(8, (rect.top + 38 - current.pointerY) * 0.25);
        } else if (current.pointerY > rect.bottom - 38) {
          delta = Math.min(8, (current.pointerY - (rect.bottom - 38)) * 0.25);
        }
        if (delta !== 0) {
          container.scrollTop += delta;
          const refreshedSlot = computeTargetVisibleSlot(current.pointerY);
          if (refreshedSlot !== current.targetVisibleSlot) {
            setActiveDrag((prev) =>
              prev ? { ...prev, targetVisibleSlot: refreshedSlot } : prev,
            );
          }
        }
      }
      rafId = window.requestAnimationFrame(stepScroll);
    };
    rafId = window.requestAnimationFrame(stepScroll);
    return () => window.cancelAnimationFrame(rafId);
  }, [activeDrag !== null, computeTargetVisibleSlot]);

  const handleModuleGripPointerDown = (
    mod: ModuleDescriptor,
    e: React.PointerEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const cardEl = moduleCardRefs.current.get(mod.id);
    if (!cardEl) return;
    const cardRect = cardEl.getBoundingClientRect();

    if (pendingDragRef.current?.timerId !== null && pendingDragRef.current) {
      window.clearTimeout(pendingDragRef.current.timerId);
    }

    const holdDelay =
      e.pointerType === 'touch' || e.pointerType === 'pen'
        ? TOUCH_DRAG_HOLD_MS
        : MOUSE_DRAG_HOLD_MS;

    const initialY = e.clientY;
    const timerId = window.setTimeout(() => {
      activatePendingDrag(initialY);
    }, holdDelay);

    pendingDragRef.current = {
      id: mod.id,
      label: mod.label,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      grabOffsetY: Math.max(8, Math.min(28, e.clientY - cardRect.top)),
      cardLeft: cardRect.left,
      cardWidth: cardRect.width,
      timerId,
    };
    setPendingDragId(mod.id);
  };

  const draggedVisibleIndex = activeDrag
    ? visibleModuleIds.indexOf(activeDrag.id)
    : -1;

  const effectiveInnerMode = isHidden ? lastVisibleLayoutRef.current : displayMode;

  const toggleButtonLabel =
    displayMode === 'hidden'
      ? 'Expandir barra de herramientas'
      : displayMode === 'expanded'
        ? 'Cambiar barra de herramientas a modo compacto'
        : 'Ocultar barra de herramientas';

  return (
    <>
      {/* Botón único debajo del logo de LOOPA para el ciclo de 3 estados (Expandida -> Compacta -> Oculta) */}
      <button
        type="button"
        data-testid="left-toolbar-toggle"
        data-display-mode={displayMode}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onCycleDisplayMode}
        aria-expanded={!isHidden}
        aria-controls="loopa-left-toolbar"
        aria-label={toggleButtonLabel}
        title={toggleButtonLabel}
        className={`fixed top-[54px] left-2 w-10 h-9 rounded-lg border flex items-center justify-center z-30 shadow-md transition-colors touch-manipulation ${
          displayMode === 'expanded'
            ? 'bg-[#16261a] hover:bg-[#1e3322] border-[#5ecd6e]/65 text-[#5ecd6e]'
            : displayMode === 'compact'
              ? 'bg-[#112433] hover:bg-[#173044] border-[#38bdf8]/65 text-[#7dd3fc]'
              : 'bg-[#181a1f]/95 hover:bg-[#23262e] border-[#343a47] text-[#e4e6eb]'
        }`}
      >
        <Wrench className="w-4 h-4" />
      </button>

      {/* Barra Lateral Izquierda Modular con 3 estados: Expandida / Compacta / Oculta */}
      <aside
        id="loopa-left-toolbar"
        data-testid="left-tool-sidebar"
        data-display-mode={displayMode}
        aria-label="Barra de herramientas"
        aria-hidden={isHidden}
        onPointerDown={(e) => e.stopPropagation()}
        className={`relative shrink-0 h-full bg-[#17191e] flex flex-col select-none z-20 transition-[width,opacity] duration-200 ease-out ${
          displayMode === 'expanded'
            ? 'w-[218px] sm:w-[234px] border-r border-[#2b2e37] opacity-100'
            : displayMode === 'compact'
              ? 'w-[68px] border-r border-[#2b2e37] opacity-100'
              : 'w-0 overflow-hidden border-r-0 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`${
            effectiveInnerMode === 'compact'
              ? 'w-[68px]'
              : 'w-[218px] sm:w-[234px]'
          } h-full flex flex-col min-h-0`}
        >
          {/* Reserva superior exacta cuando BARHOME está oculta para que el logo y su botón nunca tapen el encabezado */}
          {!barhomeVisible && (
            <div
              data-testid="sidebar-corner-spacer"
              className="h-12 shrink-0 border-b border-[#272b34]"
            />
          )}

          {/* Encabezado de la Barra de Herramientas (alineado junto al botón de llave inglesa fijo en x=8) */}
          {isCompact ? (
            <div
              aria-hidden="true"
              className="h-11 shrink-0 border-b border-[#272b34]"
            />
          ) : (
            <div className="h-11 pl-[54px] pr-2 border-b border-[#272b34] flex items-center justify-between gap-1 shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9ca3af] truncate">
                Herramientas
              </span>
              <button
                type="button"
                data-testid="sidebar-reset-modules-header"
                onClick={onResetModuleLayout}
                title="Restablecer organización original de los módulos"
                aria-label="Restablecer organización original de los módulos"
                className="w-7 h-7 rounded-md bg-[#20232b] hover:bg-[#2a2f3a] border border-[#2e3340] text-[#9ca3af] hover:text-[#5ecd6e] flex items-center justify-center shrink-0 transition-colors touch-manipulation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Cambio rápido Modo Objeto / Modo Edición */}
          <div className="px-1.5 pt-1.5 pb-1.5 border-b border-[#272b34] shrink-0">
            <div
              className={
                isCompact ? 'flex flex-col gap-1' : 'grid grid-cols-2 gap-1'
              }
            >
              <button
                type="button"
                data-testid="sidebar-mode-object"
                onClick={() => onToggleWorkMode('object')}
                aria-pressed={workMode === 'object'}
                aria-label="Modo Objeto (Tab)"
                title="Modo Objeto (Tab)"
                {...compactTipProps('Modo Objeto (Tab)')}
                className={`min-h-[34px] rounded-lg border flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors touch-manipulation ${
                  workMode === 'object'
                    ? 'bg-[#5ecd6e] border-[#7def8e] text-[#111215]'
                    : 'bg-[#20232b] hover:bg-[#2a2f3a] border-[#2e3340] text-[#cbd5e1] hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5 shrink-0" />
                {!isCompact && <span>Objeto</span>}
              </button>
              <button
                type="button"
                data-testid="sidebar-mode-edit"
                disabled={!canEditSelected && workMode !== 'edit'}
                onClick={() => onToggleWorkMode('edit')}
                aria-pressed={workMode === 'edit'}
                aria-label="Modo Edición (Tab)"
                title="Modo Edición (Tab)"
                {...compactTipProps('Modo Edición (Tab)')}
                className={`min-h-[34px] rounded-lg border flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed ${
                  workMode === 'edit'
                    ? 'bg-[#5ecd6e] border-[#7def8e] text-[#111215]'
                    : 'bg-[#20232b] hover:bg-[#2a2f3a] border-[#2e3340] text-[#cbd5e1] hover:text-white'
                }`}
              >
                <Scissors className="w-3.5 h-3.5 shrink-0" />
                {!isCompact && <span>Edición</span>}
              </button>
            </div>
          </div>

          {/* Lista Modular Ordenable y Contraíble */}
          <div
            ref={scrollContainerRef}
            data-testid="sidebar-modules-list"
            onScroll={hideCompactTooltip}
            className="flex-1 min-h-0 overflow-y-auto cad-scroll px-1.5 py-1.5 flex flex-col gap-1.5"
          >
            {visibleModules.map((mod, visibleIdx) => {
              const isExpanded = Boolean(expandedModules[mod.id]);
              const isDraggingThis = activeDrag?.id === mod.id;
              const isPendingThis = pendingDragId === mod.id && !activeDrag;
              const showDropBefore =
                activeDrag !== null &&
                activeDrag.targetVisibleSlot === visibleIdx &&
                visibleIdx !== draggedVisibleIndex &&
                visibleIdx !== draggedVisibleIndex + 1;

              return (
                <React.Fragment key={mod.id}>
                  {showDropBefore && (
                    <div
                      data-testid="module-drop-indicator"
                      className="h-1 mx-1 rounded-full bg-[#5ecd6e] shadow-[0_0_8px_#5ecd6e] shrink-0"
                    />
                  )}

                  <div
                    ref={(el) => {
                      if (el) moduleCardRefs.current.set(mod.id, el);
                      else moduleCardRefs.current.delete(mod.id);
                    }}
                    data-testid={`sidebar-module-${mod.id}`}
                    className={`rounded-lg border transition-colors ${
                      isDraggingThis
                        ? 'opacity-35 border-dashed border-[#5ecd6e]/70 bg-[#12151a]'
                        : isPendingThis
                          ? 'bg-[#1c2224] border-[#5ecd6e]/55'
                          : 'bg-[#1b1e25]/85 border-[#282c36]'
                    }`}
                  >
                    {/* Encabezado independiente del módulo: Agarre + Expansión */}
                    <div
                      className={`h-9 ${
                        isCompact ? 'px-0.5' : 'px-1'
                      } flex items-center gap-0.5 select-none`}
                    >
                      <button
                        type="button"
                        data-testid={`module-drag-handle-${mod.id}`}
                        onPointerDown={(e) => handleModuleGripPointerDown(mod, e)}
                        onContextMenu={(e) => e.preventDefault()}
                        aria-label={`Arrastrar módulo ${mod.label}`}
                        title={`Arrastrar módulo ${mod.label}`}
                        className={`${
                          isCompact ? 'w-5' : 'w-7'
                        } h-7 rounded flex items-center justify-center text-[#6e7685] hover:text-[#e4e6eb] hover:bg-[#262a34] cursor-grab active:cursor-grabbing shrink-0 touch-none`}
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        data-testid={`module-toggle-${mod.id}`}
                        onClick={(e) => {
                          onToggleModuleExpanded(mod.id);
                          if (isCompact) {
                            showCompactTooltip(
                              `${mod.label} (${isExpanded ? 'Contraído' : 'Expandido'})`,
                              e.currentTarget,
                              1800,
                            );
                          }
                        }}
                        aria-expanded={isExpanded}
                        aria-label={`${mod.label} (${isExpanded ? 'Contraer' : 'Expandir'})`}
                        title={
                          isCompact
                            ? `${mod.label} (${isExpanded ? 'Contraer' : 'Expandir'})`
                            : undefined
                        }
                        {...compactTipProps(mod.label)}
                        className={`flex-1 min-w-0 h-7 ${
                          isCompact
                            ? 'px-0.5 justify-center'
                            : 'px-1 justify-between text-left'
                        } rounded hover:bg-[#252932] flex items-center gap-1 transition-colors touch-manipulation`}
                      >
                        {isCompact ? (
                          <span className="flex items-center justify-center gap-0.5">
                            {mod.icon}
                            {isExpanded ? (
                              <ChevronDown className="w-2.5 h-2.5 shrink-0 text-[#6e7685]" />
                            ) : (
                              <ChevronRight className="w-2.5 h-2.5 shrink-0 text-[#6e7685]" />
                            )}
                          </span>
                        ) : (
                          <>
                            <span className="flex items-center gap-1.5 min-w-0">
                              {mod.icon}
                              <span className="text-[11px] font-semibold text-[#d1d5db] truncate">
                                {mod.label}
                              </span>
                              {mod.badge}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[#6e7685]" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#6e7685]" />
                            )}
                          </>
                        )}
                      </button>
                    </div>

                    {/* Contenido de herramientas del módulo */}
                    {isExpanded && (
                      <div
                        className={`${
                          isCompact ? 'px-1 pb-1.5 pt-1' : 'px-1.5 pb-1.5 pt-1'
                        } border-t border-[#262a34]/75 flex flex-col gap-1`}
                      >
                        {mod.renderBody()}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            {activeDrag !== null &&
              activeDrag.targetVisibleSlot >= visibleModules.length &&
              draggedVisibleIndex !== visibleModules.length - 1 && (
                <div
                  data-testid="module-drop-indicator"
                  className="h-1 mx-1 rounded-full bg-[#5ecd6e] shadow-[0_0_8px_#5ecd6e] shrink-0"
                />
              )}

            {/* Pie discreto para restablecer organización de módulos */}
            <button
              type="button"
              data-testid="sidebar-reset-modules"
              onClick={onResetModuleLayout}
              aria-label="Restablecer organización original de los módulos"
              title="Restablecer organización original de los módulos"
              {...compactTipProps('Restablecer módulos')}
              className="mt-1 h-8 px-2 rounded-lg bg-[#14161b] hover:bg-[#20232b] border border-[#262a34] text-[11px] font-medium text-[#8e95a2] hover:text-[#e4e6eb] flex items-center justify-center gap-1.5 shrink-0 transition-colors touch-manipulation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#5ecd6e] shrink-0" />
              {!isCompact && <span>Restablecer módulos</span>}
            </button>
          </div>
        </div>

        {/* Tooltip flotante / etiqueta accesible en modo compacto (hover desktop + toque en tablet) */}
        {isCompact && compactTooltip && !activeDrag && (
          <div
            role="tooltip"
            data-testid="compact-sidebar-tooltip"
            style={{ top: compactTooltip.top }}
            className="fixed left-[74px] -translate-y-1/2 z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-[#181a1f]/95 border border-[#5ecd6e]/55 text-xs font-medium text-[#f3f4f6] shadow-xl whitespace-nowrap"
          >
            {compactTooltip.label}
          </div>
        )}

        {/* Representación flotante del módulo durante arrastre */}
        {activeDrag && (
          <div
            data-testid="module-drag-preview"
            style={{
              left: activeDrag.cardLeft,
              top: Math.max(8, activeDrag.pointerY - activeDrag.grabOffsetY),
              width: Math.max(activeDrag.cardWidth, 168),
            }}
            className="fixed z-50 pointer-events-none rounded-lg bg-[#20242d]/95 border border-[#5ecd6e] shadow-2xl px-2.5 py-2 flex items-center justify-between gap-2 scale-[1.02]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="w-3.5 h-3.5 text-[#5ecd6e] shrink-0" />
              {moduleDescriptors[activeDrag.id].icon}
              <span className="text-xs font-semibold text-[#f3f4f6] truncate">
                {activeDrag.label}
              </span>
            </div>
            <span className="text-[10px] font-medium text-[#5ecd6e] shrink-0">
              Mover
            </span>
          </div>
        )}

        {/* Popover: Add Primitive */}
        {!isHidden && showPrimitivePopover && workMode === 'object' && (
          <div
            className="absolute left-full top-12 ml-2 z-40"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <PrimitiveMenu
              onAddPrimitive={(type, options) => {
                onAddPrimitive(type, options);
                setShowPrimitivePopover(false);
              }}
              onClose={() => setShowPrimitivePopover(false)}
            />
          </div>
        )}

        {/* Popover: Contextual Edit Delete/Dissolve */}
        {!isHidden && showDeletePopover && workMode === 'edit' && (
          <div
            className="absolute left-full bottom-12 ml-2 z-40"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <DeleteMenuPopover
              editSelectionMode={editSelectionMode}
              onSelectAction={(action) => {
                onExecuteContextualDelete(action);
                setShowDeletePopover(false);
              }}
              onLimitedDissolve={() => {
                onStartOperator('dissolve_limited');
                setShowDeletePopover(false);
              }}
              onClose={() => setShowDeletePopover(false)}
            />
          </div>
        )}
      </aside>
    </>
  );
};
