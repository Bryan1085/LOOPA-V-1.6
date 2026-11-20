import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Axis3d,
  Box,
  Camera,
  CheckSquare,
  Columns,
  Copy,
  FilePlus2,
  Film,
  FlipHorizontal,
  Focus,
  FolderOpen,
  GitMerge,
  Grid,
  Grid3X3,
  Hammer,
  Layers,
  Maximize2,
  Move,
  PaintBucket,
  Palette,
  PanelRight,
  PanelTop,
  Plus,
  Redo2,
  RotateCw,
  Save,
  Scissors,
  Sparkles,
  Square,
  SquareDashed,
  SquareDashedMousePointer,
  Undo2,
  Waypoints,
  X,
} from 'lucide-react';
import { EditSelectionMode } from '../core/mesh/operations';
import { PrimitiveType } from '../core/mesh/primitives';
import { LeftToolbarDisplayMode } from '../core/project/storage';
import {
  AxisConstraint,
  CameraProjection,
  ObjectShadingMode,
  SaveStatus,
  TransformTool,
  ViewportDisplayMode,
  WorkMode,
} from '../core/project/types';
import type { CameraPreset } from '../engine/ViewportEngine';
import type { EditOperatorType } from '../state/useModelerStore';
import type { WorkspaceId } from './TopBar';
import type { UVQuickAccessState, UVWorkspaceHandle } from './UVWorkspace';
import { ProportionalIcon } from './ProportionalIcons';

export type QuickAccessMenuKey = 'barhome' | 'toolbar';

interface FloatingQuickAccessButtonsProps {
  activeWorkspace: WorkspaceId;
  leftToolbarMode: LeftToolbarDisplayMode;
  hasBottomOverlayBar?: boolean;
  // BARHOME quick-access state & handlers
  hasUnsavedChanges: boolean;
  saveStatus: SaveStatus;
  projection: CameraProjection;
  displayMode: ViewportDisplayMode;
  showGrid: boolean;
  showAxes: boolean;
  showFaceOrientation: boolean;
  showLiner: boolean;
  onCreateProjectModal: () => void;
  onOpenProjectModal: () => void;
  onSaveProject: () => void;
  onChangeProjection: (projection: CameraProjection) => void;
  onSelectDisplayMode: (mode: ViewportDisplayMode) => void;
  onSelectCameraPreset: (preset: CameraPreset) => void;
  onFocusSelected: () => void;
  onToggleGrid: () => void;
  onToggleAxes: () => void;
  onToggleFaceOrientation: () => void;
  onToggleLiner: () => void;
  onChangeWorkspace: (workspace: WorkspaceId) => void;
  // Toolbar quick-access state & handlers
  workMode: WorkMode;
  editSelectionMode: EditSelectionMode;
  activeTool: TransformTool;
  axisConstraint: AxisConstraint;
  activeOperatorType: EditOperatorType | null;
  canEditSelected: boolean;
  hasSelectedObject: boolean;
  hasSelectedComponents: boolean;
  multiSelectTouch: boolean;
  proportionalEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleWorkMode: (mode: WorkMode) => void;
  onChangeEditSelectionMode: (mode: EditSelectionMode) => void;
  onSelectTool: (tool: TransformTool) => void;
  onChangeAxisConstraint: (axis: AxisConstraint) => void;
  onGQuickTapMove: () => void;
  onToggleMultiSelectTouch: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectConnected: () => void;
  onStartOperator: (type: EditOperatorType) => void;
  onFillSelection: () => void;
  onConnectVertexPath: () => void;
  onMarkSeams: (isSeam: boolean) => void;
  onToggleProportional: () => void;
  onAddPrimitive: (type: PrimitiveType) => void;
  onDuplicateObject: () => void;
  // Materials workspace context
  selectedObjectShading?: ObjectShadingMode | null;
  onSetSelectedObjectShading?: (shading: ObjectShadingMode) => void;
  // UV workspace context
  uvQuickState?: UVQuickAccessState | null;
  uvActionsRef?: React.RefObject<UVWorkspaceHandle | null>;
}

interface FloatingMenuCoords {
  left: number;
  top: number;
  maxHeight: number;
}

const WORKSPACE_QUICK_LIST: {
  id: WorkspaceId;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: 'layout', label: 'Layout', icon: <Box className="w-3.5 h-3.5 text-[#5ecd6e] shrink-0" /> },
  { id: 'uv_editing', label: 'Editor UV', icon: <Grid3X3 className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" /> },
  { id: 'timelapse', label: 'Timelapse', icon: <Film className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" /> },
  { id: 'materials', label: 'Materiales', icon: <Palette className="w-3.5 h-3.5 text-[#a78bfa] shrink-0" /> },
];

export function computeClampedQuickMenuPosition(
  triggerRect: { left: number; right: number; top: number; bottom: number },
  viewportWidth: number,
  viewportHeight: number,
  menuWidth = 284,
  preferredMaxHeight = 420,
): FloatingMenuCoords {
  const safeWidth = Math.min(menuWidth, Math.max(200, viewportWidth - 16));
  const maxHeight = Math.min(preferredMaxHeight, Math.max(180, viewportHeight - 16));

  // Prefer placing right beside the trigger button; fall back to clamped horizontal fit
  const rightCandidate = triggerRect.right + 10;
  const left =
    rightCandidate + safeWidth <= viewportWidth - 8
      ? rightCandidate
      : Math.max(8, Math.min(viewportWidth - safeWidth - 8, triggerRect.left));

  // Align bottom of menu near bottom of trigger button so bottom-left triggers pop upward neatly
  const idealTop = triggerRect.bottom - maxHeight;
  const top = Math.max(8, Math.min(viewportHeight - maxHeight - 8, idealTop));

  return { left, top, maxHeight };
}

export const FloatingQuickAccessButtons: React.FC<FloatingQuickAccessButtonsProps> = ({
  activeWorkspace,
  leftToolbarMode,
  hasBottomOverlayBar = false,
  hasUnsavedChanges,
  saveStatus,
  projection,
  displayMode,
  showGrid,
  showAxes,
  showFaceOrientation,
  showLiner,
  onCreateProjectModal,
  onOpenProjectModal,
  onSaveProject,
  onChangeProjection,
  onSelectDisplayMode,
  onSelectCameraPreset,
  onFocusSelected,
  onToggleGrid,
  onToggleAxes,
  onToggleFaceOrientation,
  onToggleLiner,
  onChangeWorkspace,
  workMode,
  editSelectionMode,
  activeTool,
  axisConstraint,
  activeOperatorType,
  canEditSelected,
  hasSelectedObject,
  hasSelectedComponents,
  multiSelectTouch,
  proportionalEnabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onToggleWorkMode,
  onChangeEditSelectionMode,
  onSelectTool,
  onChangeAxisConstraint,
  onGQuickTapMove,
  onToggleMultiSelectTouch,
  onSelectAll,
  onDeselectAll,
  onSelectConnected,
  onStartOperator,
  onFillSelection,
  onConnectVertexPath,
  onMarkSeams,
  onToggleProportional,
  onAddPrimitive,
  onDuplicateObject,
  selectedObjectShading = null,
  onSetSelectedObjectShading,
  uvQuickState = null,
  uvActionsRef,
}) => {
  const [openMenu, setOpenMenu] = useState<QuickAccessMenuKey | null>(null);
  const [menuCoords, setMenuCoords] = useState<FloatingMenuCoords>({
    left: 72,
    top: 80,
    maxHeight: 400,
  });

  const barhomeBtnRef = useRef<HTMLButtonElement | null>(null);
  const toolbarBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);

  const updateCoordsForMenu = useCallback((key: QuickAccessMenuKey) => {
    const btn =
      key === 'barhome' ? barhomeBtnRef.current : toolbarBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuCoords(
      computeClampedQuickMenuPosition(
        rect,
        window.innerWidth,
        window.innerHeight,
      ),
    );
  }, []);

  const handleToggleMenu = (key: QuickAccessMenuKey) => {
    if (openMenu === key) {
      setOpenMenu(null);
      return;
    }
    setOpenMenu(key);
    window.requestAnimationFrame(() => {
      updateCoordsForMenu(key);
    });
  };

  // Close open menu when switching workspaces to keep context accurate
  useEffect(() => {
    setOpenMenu(null);
  }, [activeWorkspace]);

  // Keep menu clamped inside viewport on window resize or sidebar shift
  useEffect(() => {
    if (!openMenu) return;
    updateCoordsForMenu(openMenu);
    const onResize = () => updateCoordsForMenu(openMenu);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [openMenu, leftToolbarMode, activeWorkspace, updateCoordsForMenu]);

  // Dismiss on outside pointerdown or Escape without dimming/blocking the scene
  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        menuPanelRef.current?.contains(target) ||
        barhomeBtnRef.current?.contains(target) ||
        toolbarBtnRef.current?.contains(target)
      ) {
        return;
      }
      setOpenMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu]);

  const placementClass = useMemo(() => {
    if (activeWorkspace === 'timelapse') {
      return 'top-14 left-3.5';
    }
    if (activeWorkspace === 'materials') {
      return 'bottom-4 left-3.5 sm:left-[334px]';
    }
    if (activeWorkspace === 'uv_editing') {
      return 'bottom-4 left-3.5 md:left-[302px]';
    }
    // Layout workspace: stay cleanly to the right of LeftToolSidebar
    const leftOffset =
      leftToolbarMode === 'expanded'
        ? 'left-[232px] sm:left-[248px]'
        : leftToolbarMode === 'compact'
          ? 'left-[82px]'
          : 'left-3.5';
    const bottomOffset = hasBottomOverlayBar
      ? 'bottom-20 md:bottom-4'
      : 'bottom-4';
    return `${bottomOffset} ${leftOffset}`;
  }, [activeWorkspace, hasBottomOverlayBar, leftToolbarMode]);

  const menuTitle =
    openMenu === 'barhome'
      ? 'Acceso rápido · BARHOME'
      : activeWorkspace === 'uv_editing'
        ? 'Herramientas UV'
        : activeWorkspace === 'materials'
          ? 'Herramientas de materiales'
          : activeWorkspace === 'timelapse'
            ? 'Acceso rápido · Timelapse'
            : workMode === 'edit'
              ? 'Herramientas · Modo Edición'
              : 'Herramientas · Modo Objeto';

  const quickBtnClass = (active: boolean, disabled = false) =>
    `min-h-[36px] px-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors touch-manipulation ${
      disabled
        ? 'opacity-40 cursor-not-allowed bg-[#1a1c22] border-transparent text-[#6b7280]'
        : active
          ? 'bg-[#5ecd6e] border-[#7def8e] text-[#111215] font-semibold'
          : 'bg-[#20232b] hover:bg-[#2a2f3a] border-[#2e3340] text-[#e4e6eb]'
    }`;

  return (
    <>
      {/* Dos botones flotantes independientes de acceso rápido */}
      <div
        data-testid="floating-quick-access-stack"
        onPointerDown={(e) => e.stopPropagation()}
        className={`fixed ${placementClass} z-30 flex flex-col gap-2 transition-[left,top,bottom] duration-200 ease-out`}
      >
        <button
          ref={barhomeBtnRef}
          type="button"
          data-testid="floating-quick-barhome-btn"
          onClick={() => handleToggleMenu('barhome')}
          aria-expanded={openMenu === 'barhome'}
          aria-haspopup="menu"
          aria-label="Acceso rápido a BARHOME"
          title="Acceso rápido a BARHOME (Archivo, Viewport, Ventanas)"
          className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-sm transition-colors touch-manipulation ${
            openMenu === 'barhome'
              ? 'bg-[#16261a] border-[#5ecd6e] text-[#5ecd6e]'
              : 'bg-[#181a1f]/95 hover:bg-[#242832] border-[#343a47] text-[#e4e6eb] hover:text-[#5ecd6e]'
          }`}
        >
          <PanelTop className="w-5 h-5" />
        </button>

        <button
          ref={toolbarBtnRef}
          type="button"
          data-testid="floating-quick-toolbar-btn"
          onClick={() => handleToggleMenu('toolbar')}
          aria-expanded={openMenu === 'toolbar'}
          aria-haspopup="menu"
          aria-label="Acceso rápido a herramientas"
          title="Acceso rápido a la barra de herramientas"
          className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-lg backdrop-blur-sm transition-colors touch-manipulation ${
            openMenu === 'toolbar'
              ? 'bg-[#16261a] border-[#5ecd6e] text-[#5ecd6e]'
              : 'bg-[#181a1f]/95 hover:bg-[#242832] border-[#343a47] text-[#e4e6eb] hover:text-[#5ecd6e]'
          }`}
        >
          <Hammer className="w-5 h-5" />
        </button>
      </div>

      {/* Menú flotante único (al abrir uno se cierra el otro automáticamente) */}
      {openMenu && (
        <div
          ref={menuPanelRef}
          role="menu"
          data-testid={
            openMenu === 'barhome'
              ? 'floating-quick-barhome-menu'
              : 'floating-quick-toolbar-menu'
          }
          aria-label={menuTitle}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            left: menuCoords.left,
            top: menuCoords.top,
            maxHeight: menuCoords.maxHeight,
          }}
          className="fixed w-[min(284px,calc(100vw-16px))] z-40 rounded-xl bg-[#181a1f]/98 border border-[#343a47] shadow-2xl backdrop-blur-md flex flex-col overflow-hidden"
        >
          {/* Header compacto del menú */}
          <div className="px-3 py-2 border-b border-[#272b34] bg-[#14161b] flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#cbd5e1] truncate">
              {menuTitle}
            </span>
            <button
              type="button"
              onClick={() => setOpenMenu(null)}
              aria-label="Cerrar menú flotante"
              className="w-7 h-7 rounded-md bg-[#20232b] hover:bg-[#2b303c] text-[#9ca3af] hover:text-white flex items-center justify-center shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Contenido desplazable sin salirse de pantalla */}
          <div className="p-2.5 overflow-y-auto cad-scroll space-y-3">
            {openMenu === 'barhome' ? (
              <>
                {/* 1. Archivo */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2] px-0.5">
                    Archivo
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      data-testid="quick-file-new"
                      onClick={() => {
                        setOpenMenu(null);
                        onCreateProjectModal();
                      }}
                      className={quickBtnClass(false)}
                    >
                      <FilePlus2 className="w-3.5 h-3.5 text-[#5ecd6e] shrink-0" />
                      <span>Nuevo</span>
                    </button>
                    <button
                      type="button"
                      data-testid="quick-file-open"
                      onClick={() => {
                        setOpenMenu(null);
                        onOpenProjectModal();
                      }}
                      className={quickBtnClass(false)}
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[#5ecd6e] shrink-0" />
                      <span>Abrir</span>
                    </button>
                    <button
                      type="button"
                      data-testid="quick-file-save"
                      onClick={() => {
                        setOpenMenu(null);
                        onSaveProject();
                      }}
                      className={quickBtnClass(
                        saveStatus === 'unsaved' || hasUnsavedChanges,
                      )}
                    >
                      <Save className="w-3.5 h-3.5 shrink-0" />
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>

                {/* 2. Viewport */}
                <div className="space-y-1.5 pt-2 border-t border-[#262a33]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2] px-0.5">
                    Viewport
                  </div>

                  {/* Proyección */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChangeProjection('perspective')}
                      className={quickBtnClass(projection === 'perspective')}
                    >
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      <span>Perspectiva</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeProjection('orthographic')}
                      className={quickBtnClass(projection === 'orthographic')}
                    >
                      <Grid3X3 className="w-3.5 h-3.5 shrink-0" />
                      <span>Ortográfica</span>
                    </button>
                  </div>

                  {/* Modos de sombreado */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'solid', label: 'Sólido' },
                        { id: 'wireframe', label: 'Wireframe' },
                        { id: 'material', label: 'Material' },
                        { id: 'xray', label: 'Rayos X' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelectDisplayMode(m.id)}
                        className={quickBtnClass(displayMode === m.id)}
                      >
                        <span className="truncate">{m.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Vistas clave + Encuadrar */}
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: 'front', label: 'Frente' },
                        { id: 'right', label: 'Lat.' },
                        { id: 'top', label: 'Sup.' },
                        { id: 'iso', label: 'Iso' },
                      ] as const
                    ).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          onSelectCameraPreset(preset.id);
                          setOpenMenu(null);
                        }}
                        className="h-8 rounded-md bg-[#20232b] hover:bg-[#2a2f3a] border border-[#2e3340] text-[11px] font-medium text-[#d1d5db] transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Guías y LINER */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onFocusSelected();
                        setOpenMenu(null);
                      }}
                      className={quickBtnClass(false)}
                    >
                      <Focus className="w-3.5 h-3.5 text-[#5ecd6e] shrink-0" />
                      <span>Encuadrar</span>
                    </button>
                    <button
                      type="button"
                      data-testid="quick-viewport-liner"
                      onClick={() => {
                        onToggleLiner();
                        setOpenMenu(null);
                      }}
                      className={quickBtnClass(showLiner)}
                    >
                      <PanelRight className="w-3.5 h-3.5 shrink-0" />
                      <span>LINER</span>
                    </button>
                    <button
                      type="button"
                      onClick={onToggleGrid}
                      className={quickBtnClass(showGrid)}
                    >
                      <Grid className="w-3.5 h-3.5 shrink-0" />
                      <span>Cuadrícula</span>
                    </button>
                    <button
                      type="button"
                      onClick={onToggleAxes}
                      className={quickBtnClass(showAxes)}
                    >
                      <Axis3d className="w-3.5 h-3.5 shrink-0" />
                      <span>Ejes X/Y/Z</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleFaceOrientation}
                    className={`w-full ${quickBtnClass(showFaceOrientation)}`}
                  >
                    <span
                      className="inline-flex w-3.5 h-3.5 rounded-sm overflow-hidden border border-white/25 shrink-0"
                      aria-hidden="true"
                    >
                      <span className="w-1/2 h-full bg-[#2563eb]" />
                      <span className="w-1/2 h-full bg-[#e03131]" />
                    </span>
                    <span>Face Orientation</span>
                  </button>
                </div>

                {/* 3. Ventanas (Espacios de trabajo) */}
                <div className="space-y-1.5 pt-2 border-t border-[#262a33]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2] px-0.5">
                    Ventanas
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {WORKSPACE_QUICK_LIST.map((ws) => (
                      <button
                        key={ws.id}
                        type="button"
                        data-testid={`quick-workspace-${ws.id}`}
                        onClick={() => {
                          setOpenMenu(null);
                          onChangeWorkspace(ws.id);
                        }}
                        className={quickBtnClass(activeWorkspace === ws.id)}
                      >
                        {ws.icon}
                        <span className="truncate">{ws.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : activeWorkspace === 'uv_editing' ? (
              /* HERRAMIENTAS CONTEXTUALES: EDITOR UV */
              uvQuickState && uvQuickState.hasMesh ? (
                <>
                  {/* Modo de selección UV */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2] px-0.5">
                      Selección UV
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          { id: 'vertex', label: 'Vért.' },
                          { id: 'edge', label: 'Arista' },
                          { id: 'face', label: 'Cara' },
                          { id: 'island', label: 'Isla' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            uvActionsRef?.current?.setSelectionMode(m.id)
                          }
                          className={`h-8 rounded-md text-[11px] font-semibold border transition-colors ${
                            uvQuickState.selectionMode === m.id
                              ? 'bg-[#5ecd6e] border-[#7def8e] text-[#111215]'
                              : 'bg-[#20232b] hover:bg-[#2a2f3a] border-[#2e3340] text-[#cbd5e1]'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => uvActionsRef?.current?.selectAll()}
                        className={quickBtnClass(false)}
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-[#5ecd6e]" />
                        <span>Todo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => uvActionsRef?.current?.deselectAll()}
                        className={quickBtnClass(false)}
                      >
                        <X className="w-3.5 h-3.5 text-[#9ca3af]" />
                        <span>Limpiar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => uvActionsRef?.current?.invertSelection()}
                        className={quickBtnClass(false)}
                      >
                        <SquareDashed className="w-3.5 h-3.5 text-[#a78bfa]" />
                        <span>Invertir</span>
                      </button>
                    </div>
                  </div>

                  {/* Transformación UV */}
                  <div className="space-y-1.5 pt-2 border-t border-[#262a33]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2] px-0.5">
                      Transformación 2D
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          uvActionsRef?.current?.setTransformTool('move')
                        }
                        className={quickBtnClass(
                          !uvQuickState.boxSelectActive &&
                            uvQuickState.transformTool === 'move',
                        )}
                      >
                        <Move className="w-3.5 h-3.5" />
                        <span>Mover</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          uvActionsRef?.current?.setTransformTool('rotate')
                        }
                        className={quickBtnClass(
                          !uvQuickState.boxSelectActive &&
                            uvQuickState.transformTool === 'rotate',
                        )}
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Rotar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          uvActionsRef?.current?.setTransformTool('scale')
                        }
                        className={quickBtnClass(
                          !uvQuickState.boxSelectActive &&
                            uvQuickState.transformTool === 'scale',
                        )}
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Escalar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          uvActionsRef?.current?.toggleBoxSelect()
                        }
                        className={quickBtnClass(uvQuickState.boxSelectActive)}
                      >
                        <SquareDashedMousePointer className="w-3.5 h-3.5" />
                        <span>Área</span>
                      </button>
                    </div>
                  </div>

                  {/* Despliegue y utilidades UV */}
                  <div className="space-y-1.5 pt-2 border-t border-[#262a33]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2] px-0.5">
                      Despliegue y mapa UV
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        data-testid="quick-uv-unwrap"
                        onClick={() => uvActionsRef?.current?.unwrap('unwrap')}
                        className={quickBtnClass(false)}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#5ecd6e]" />
                        <span>Unwrap</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => uvActionsRef?.current?.pack()}
                        className={quickBtnClass(false)}
                      >
                        <Layers className="w-3.5 h-3.5 text-[#f59e0b]" />
                        <span>Pack Islas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => uvActionsRef?.current?.unwrap('planar')}
                        className={quickBtnClass(false)}
                      >
                        <Box className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>Plana</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => uvActionsRef?.current?.toggleChecker()}
                        className={quickBtnClass(uvQuickState.showChecker)}
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span>Checker</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={!canUndo}
                        onClick={onUndo}
                        className={quickBtnClass(false, !canUndo)}
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Deshacer</span>
                      </button>
                      <button
                        type="button"
                        disabled={!canRedo}
                        onClick={onRedo}
                        className={quickBtnClass(false, !canRedo)}
                      >
                        <Redo2 className="w-3.5 h-3.5" />
                        <span>Rehacer</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2 text-xs text-[#9ca3af] p-1">
                  <p>Selecciona un objeto de malla para utilizar las herramientas UV.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(null);
                      onChangeWorkspace('layout');
                    }}
                    className={`w-full ${quickBtnClass(false)}`}
                  >
                    <Box className="w-3.5 h-3.5 text-[#5ecd6e]" />
                    <span>Ir a Layout</span>
                  </button>
                </div>
              )
            ) : activeWorkspace === 'materials' ? (
              /* HERRAMIENTAS CONTEXTUALES: EDITOR DE MATERIALES */
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2] px-0.5">
                  Vista y acabado de material
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onSelectDisplayMode(
                        displayMode === 'material' ? 'solid' : 'material',
                      )
                    }
                    className={quickBtnClass(displayMode === 'material')}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Vista Material</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onFocusSelected();
                      setOpenMenu(null);
                    }}
                    className={quickBtnClass(false)}
                  >
                    <Focus className="w-3.5 h-3.5 text-[#5ecd6e]" />
                    <span>Encuadrar</span>
                  </button>
                </div>
                {onSetSelectedObjectShading && selectedObjectShading && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSetSelectedObjectShading('flat')}
                      className={quickBtnClass(selectedObjectShading === 'flat')}
                    >
                      <span>Sombreado Plano</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetSelectedObjectShading('smooth')}
                      className={quickBtnClass(
                        selectedObjectShading === 'smooth',
                      )}
                    >
                      <span>Sombreado Suave</span>
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    onChangeWorkspace('layout');
                  }}
                  className={`w-full ${quickBtnClass(false)}`}
                >
                  <Box className="w-3.5 h-3.5 text-[#5ecd6e]" />
                  <span>Volver a Layout 3D</span>
                </button>
              </div>
            ) : activeWorkspace === 'timelapse' ? (
              /* HERRAMIENTAS CONTEXTUALES: TIMELAPSE */
              <div className="space-y-2">
                <p className="text-[11px] text-[#9ca3af] leading-snug px-0.5">
                  Las herramientas de modelado y UV no están activas durante la reproducción de Timelapse.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    onChangeWorkspace('layout');
                  }}
                  className={`w-full ${quickBtnClass(false)}`}
                >
                  <Box className="w-3.5 h-3.5 text-[#5ecd6e]" />
                  <span>Volver a Layout 3D</span>
                </button>
              </div>
            ) : (
              /* HERRAMIENTAS CONTEXTUALES: LAYOUT (MODO OBJETO / MODO EDICIÓN) */
              <>
                {/* Selector rápido Modo Objeto / Modo Edición + Historial */}
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleWorkMode('object')}
                      className={quickBtnClass(workMode === 'object')}
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>Modo Objeto</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canEditSelected && workMode !== 'edit'}
                      onClick={() => onToggleWorkMode('edit')}
                      className={quickBtnClass(
                        workMode === 'edit',
                        !canEditSelected && workMode !== 'edit',
                      )}
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Modo Edición</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={!canUndo}
                      onClick={onUndo}
                      className={quickBtnClass(false, !canUndo)}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Deshacer</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canRedo}
                      onClick={onRedo}
                      className={quickBtnClass(false, !canRedo)}
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                      <span>Rehacer</span>
                    </button>
                  </div>
                </div>

                {/* Selección */}
                <div className="space-y-1.5 pt-2 border-t border-[#262a33]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2] px-0.5">
                    Selección
                  </div>
                  {workMode === 'edit' && (
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'vertex', label: 'Vértice' },
                          { id: 'edge', label: 'Arista' },
                          { id: 'face', label: 'Cara' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => onChangeEditSelectionMode(m.id)}
                          className={`h-8 rounded-md text-[11px] font-semibold border transition-colors ${
                            editSelectionMode === m.id
                              ? 'bg-[#5ecd6e] border-[#7def8e] text-[#111215]'
                              : 'bg-[#20232b] hover:bg-[#2a2f3a] border-[#2e3340] text-[#cbd5e1]'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      disabled={workMode === 'edit' && !canEditSelected}
                      onClick={onSelectAll}
                      className={quickBtnClass(
                        false,
                        workMode === 'edit' && !canEditSelected,
                      )}
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-[#5ecd6e]" />
                      <span>Todo</span>
                    </button>
                    <button
                      type="button"
                      disabled={
                        workMode === 'edit'
                          ? !hasSelectedComponents
                          : !hasSelectedObject
                      }
                      onClick={onDeselectAll}
                      className={quickBtnClass(
                        false,
                        workMode === 'edit'
                          ? !hasSelectedComponents
                          : !hasSelectedObject,
                      )}
                    >
                      <X className="w-3.5 h-3.5 text-[#9ca3af]" />
                      <span>Limpiar</span>
                    </button>
                    {workMode === 'edit' ? (
                      <button
                        type="button"
                        disabled={!canEditSelected || !hasSelectedComponents}
                        onClick={onSelectConnected}
                        className={quickBtnClass(
                          false,
                          !canEditSelected || !hasSelectedComponents,
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>Conect.</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onToggleMultiSelectTouch}
                        className={quickBtnClass(multiSelectTouch)}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Múltiple</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Transformación */}
                <div className="space-y-1.5 pt-2 border-t border-[#262a33]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2] px-0.5">
                    Transformación
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={!hasSelectedObject}
                      onClick={() => onSelectTool('move')}
                      className={quickBtnClass(
                        activeTool === 'move' && !activeOperatorType,
                        !hasSelectedObject,
                      )}
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span>Mover</span>
                    </button>
                    <button
                      type="button"
                      disabled={!hasSelectedObject}
                      onClick={() => onSelectTool('rotate')}
                      className={quickBtnClass(
                        activeTool === 'rotate' && !activeOperatorType,
                        !hasSelectedObject,
                      )}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotar</span>
                    </button>
                    <button
                      type="button"
                      disabled={!hasSelectedObject}
                      onClick={() => onSelectTool('scale')}
                      className={quickBtnClass(
                        activeTool === 'scale' && !activeOperatorType,
                        !hasSelectedObject,
                      )}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Escalar</span>
                    </button>
                    <button
                      type="button"
                      disabled={!hasSelectedObject}
                      onClick={() => {
                        setOpenMenu(null);
                        onGQuickTapMove();
                      }}
                      className={quickBtnClass(false, !hasSelectedObject)}
                    >
                      <span className="text-[10px] font-bold px-1 rounded bg-[#14161b]/60">
                        G
                      </span>
                      <span>Mover G</span>
                    </button>
                  </div>

                  {/* Restricción de ejes */}
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: 'free', label: 'Libre', active: 'bg-[#5ecd6e] text-[#111215]' },
                        { id: 'x', label: 'X', active: 'bg-[#e05252] text-white' },
                        { id: 'y', label: 'Y', active: 'bg-[#52b852] text-white' },
                        { id: 'z', label: 'Z', active: 'bg-[#48bce8] text-[#111215]' },
                      ] as const
                    ).map((ax) => (
                      <button
                        key={ax.id}
                        type="button"
                        onClick={() => onChangeAxisConstraint(ax.id)}
                        className={`h-7 rounded text-[11px] font-bold transition-colors ${
                          axisConstraint === ax.id
                            ? ax.active
                            : 'bg-[#1e2129] hover:bg-[#2a2f3a] text-[#b4bac4]'
                        }`}
                      >
                        {ax.label}
                      </button>
                    ))}
                  </div>
                </div>

                {workMode === 'edit' ? (
                  <>
                    {/* Modelado principal */}
                    <div className="space-y-1.5 pt-2 border-t border-[#262a33]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2] px-0.5">
                        Modelado
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          disabled={!canEditSelected}
                          onClick={() => {
                            setOpenMenu(null);
                            onStartOperator('extrude');
                          }}
                          className={quickBtnClass(
                            activeOperatorType === 'extrude',
                            !canEditSelected,
                          )}
                        >
                          <FlipHorizontal className="w-3.5 h-3.5" />
                          <span>Extruir</span>
                        </button>
                        <button
                          type="button"
                          disabled={!canEditSelected}
                          onClick={() => {
                            setOpenMenu(null);
                            onStartOperator('inset');
                          }}
                          className={quickBtnClass(
                            activeOperatorType === 'inset',
                            !canEditSelected,
                          )}
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Insertar</span>
                        </button>
                        <button
                          type="button"
                          disabled={!canEditSelected}
                          onClick={() => {
                            setOpenMenu(null);
                            onStartOperator('bevel');
                          }}
                          className={quickBtnClass(
                            activeOperatorType === 'bevel',
                            !canEditSelected,
                          )}
                        >
                          <Columns className="w-3.5 h-3.5" />
                          <span>Biselar</span>
                        </button>
                        <button
                          type="button"
                          disabled={!canEditSelected}
                          onClick={() => {
                            setOpenMenu(null);
                            onStartOperator('loop_cut');
                          }}
                          className={quickBtnClass(
                            activeOperatorType === 'loop_cut',
                            !canEditSelected,
                          )}
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          <span>Corte Bucle</span>
                        </button>
                        <button
                          type="button"
                          disabled={!canEditSelected}
                          onClick={() => {
                            setOpenMenu(null);
                            onStartOperator('subdivide');
                          }}
                          className={`col-span-2 ${quickBtnClass(
                            activeOperatorType === 'subdivide',
                            !canEditSelected,
                          )}`}
                        >
                          <Grid className="w-3.5 h-3.5" />
                          <span>Subdividir</span>
                        </button>
                      </div>
                    </div>

                    {/* Edición y costuras */}
                    <div className="space-y-1.5 pt-2 border-t border-[#262a33]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2] px-0.5">
                        Edición y Costuras
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          disabled={!canEditSelected}
                          onClick={() => {
                            setOpenMenu(null);
                            onStartOperator('merge');
                          }}
                          className={quickBtnClass(
                            activeOperatorType === 'merge',
                            !canEditSelected,
                          )}
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          <span>Fusionar</span>
                        </button>
                        <button
                          type="button"
                          disabled={!canEditSelected || !hasSelectedComponents}
                          onClick={onFillSelection}
                          className={quickBtnClass(
                            false,
                            !canEditSelected || !hasSelectedComponents,
                          )}
                        >
                          <PaintBucket className="w-3.5 h-3.5" />
                          <span>Crear cara</span>
                        </button>
                        <button
                          type="button"
                          disabled={
                            !canEditSelected ||
                            editSelectionMode !== 'vertex' ||
                            !hasSelectedComponents
                          }
                          onClick={onConnectVertexPath}
                          className={quickBtnClass(
                            false,
                            !canEditSelected ||
                              editSelectionMode !== 'vertex' ||
                              !hasSelectedComponents,
                          )}
                        >
                          <Waypoints className="w-3.5 h-3.5" />
                          <span>Conectar</span>
                        </button>
                        <button
                          type="button"
                          onClick={onToggleProportional}
                          className={quickBtnClass(proportionalEnabled)}
                        >
                          <ProportionalIcon className="w-3.5 h-3.5" />
                          <span>Proporcional</span>
                        </button>
                        <button
                          type="button"
                          disabled={!canEditSelected || !hasSelectedComponents}
                          onClick={() => onMarkSeams(true)}
                          className={quickBtnClass(
                            false,
                            !canEditSelected || !hasSelectedComponents,
                          )}
                        >
                          <Scissors className="w-3.5 h-3.5 text-[#f472b6]" />
                          <span>Mark Seam</span>
                        </button>
                        <button
                          type="button"
                          disabled={!canEditSelected || !hasSelectedComponents}
                          onClick={() => onMarkSeams(false)}
                          className={quickBtnClass(
                            false,
                            !canEditSelected || !hasSelectedComponents,
                          )}
                        >
                          <X className="w-3.5 h-3.5 text-[#fca5a5]" />
                          <span>Clear Seam</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Acciones rápidas de objeto en Modo Objeto */
                  <div className="space-y-1.5 pt-2 border-t border-[#262a33]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2] px-0.5">
                      Objetos 3D
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenu(null);
                          onAddPrimitive('cube');
                        }}
                        className={quickBtnClass(false)}
                      >
                        <Plus className="w-3.5 h-3.5 text-[#5ecd6e]" />
                        <span>Cubo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenu(null);
                          onAddPrimitive('uv_sphere');
                        }}
                        className={quickBtnClass(false)}
                      >
                        <Plus className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>Esfera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenu(null);
                          onAddPrimitive('plane');
                        }}
                        className={quickBtnClass(false)}
                      >
                        <Plus className="w-3.5 h-3.5 text-[#a78bfa]" />
                        <span>Plano</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={!hasSelectedObject}
                        onClick={() => {
                          setOpenMenu(null);
                          onDuplicateObject();
                        }}
                        className={quickBtnClass(false, !hasSelectedObject)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Duplicar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenu(null);
                          onFocusSelected();
                        }}
                        className={quickBtnClass(false)}
                      >
                        <Focus className="w-3.5 h-3.5 text-[#5ecd6e]" />
                        <span>Encuadrar</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
