/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Eye, Palette } from 'lucide-react';
import {
  MaterialAsset,
  ObjectShadingMode,
  SceneObjectData,
  ViewportDisplayMode,
} from '../core/project/types';
import { MaterialPanel } from './MaterialPanel';

interface MaterialWorkspaceProps {
  objects: SceneObjectData[];
  selectedObject: SceneObjectData | null;
  selectedObjectId: string | null;
  selectedObjectIds: Set<string>;
  materials: MaterialAsset[];
  displayMode: ViewportDisplayMode;
  reserveTopLeftCorner?: boolean;
  onSelectObject: (id: string) => void;
  onSetObjectShading: (objectId: string, shading: ObjectShadingMode) => void;
  onActivateMaterialPreview: () => void;
  onSetDisplayMode: (mode: ViewportDisplayMode) => void;
  onCreateMaterial: (
    initial?: Partial<Omit<MaterialAsset, 'id'>>,
    assignToSelected?: boolean,
  ) => MaterialAsset;
  onRenameMaterial: (materialId: string, name: string) => void;
  onPushMaterialHistory: () => void;
  onUpdateMaterial: (
    materialId: string,
    patch: Partial<Omit<MaterialAsset, 'id'>>,
    recordHistory?: boolean,
  ) => void;
  onDuplicateMaterial: (
    materialId: string,
    assignToSelected?: boolean,
  ) => MaterialAsset | null;
  onDeleteMaterial: (materialId: string) => { ok: boolean; error?: string };
  onAssignMaterialToObjects: (objectIds: string[], materialId: string) => void;
  onReturnToLayout: () => void;
}

export const MaterialWorkspace: React.FC<MaterialWorkspaceProps> = ({
  objects,
  selectedObject,
  selectedObjectId,
  selectedObjectIds,
  materials,
  displayMode,
  reserveTopLeftCorner = false,
  onSelectObject,
  onSetObjectShading,
  onActivateMaterialPreview,
  onSetDisplayMode,
  onCreateMaterial,
  onRenameMaterial,
  onPushMaterialHistory,
  onUpdateMaterial,
  onDuplicateMaterial,
  onDeleteMaterial,
  onAssignMaterialToObjects,
  onReturnToLayout,
}) => {
  const meshObjects = objects.filter((o) => o.objectType === 'mesh');
  const activeMeshObj =
    selectedObject && selectedObject.objectType === 'mesh'
      ? selectedObject
      : meshObjects.find((o) => selectedObjectIds.has(o.id)) ?? null;

  return (
    <aside
      data-testid="material-workspace-panel"
      className="w-80 shrink-0 h-full bg-[#16181d] border-r border-[#2b2e36] flex flex-col overflow-hidden z-20"
    >
      {reserveTopLeftCorner && (
        <div
          aria-hidden="true"
          className="h-12 shrink-0 border-b border-[#272b34] bg-[#16181d]"
        />
      )}

      {/* Workspace Header */}
      <div className="px-3 py-2.5 border-b border-[#272b34] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Palette className="w-4 h-4 text-[#a78bfa] shrink-0" />
          <span className="text-xs font-bold text-[#f3f4f6] truncate">
            Editor de materiales
          </span>
        </div>
        <button
          type="button"
          onClick={onReturnToLayout}
          className="h-7 px-2 rounded bg-[#22252d] hover:bg-[#2c313b] border border-[#323640] text-[11px] font-medium text-[#cbd5e1]"
        >
          Layout
        </button>
      </div>

      {/* Preview Mode & Mesh Selector */}
      <div className="p-3 border-b border-[#272b34] space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#9ca3af]">
            Vista en visor 3D
          </span>
          <button
            type="button"
            onClick={() =>
              onSetDisplayMode(displayMode === 'material' ? 'solid' : 'material')
            }
            className={`h-7 px-2.5 rounded border text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
              displayMode === 'material'
                ? 'bg-[#16261a] border-[#5ecd6e] text-[#7def8e]'
                : 'bg-[#22252d] hover:bg-[#2c313b] border-[#323640] text-[#e4e6eb]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{displayMode === 'material' ? 'Vista Material' : 'Activar Material'}</span>
          </button>
        </div>

        {/* Target Mesh Object Switcher */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e95a2]">
            Objeto de malla ({meshObjects.length})
          </div>
          {meshObjects.length === 0 ? (
            <div className="text-[11px] text-[#7e8592] py-1">
              No hay objetos de malla en la escena.
            </div>
          ) : (
            <div className="max-h-28 overflow-y-auto cad-scroll space-y-1 pr-0.5">
              {meshObjects.map((obj) => {
                const isSelected = obj.id === selectedObjectId || selectedObjectIds.has(obj.id);
                return (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => onSelectObject(obj.id)}
                    className={`w-full px-2 py-1.5 rounded text-left text-[11px] font-medium flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-[#2c313b] border border-[#5ecd6e]/65 text-[#5ecd6e]'
                        : 'bg-[#1c1f26] hover:bg-[#242832] border border-transparent text-[#d1d5db]'
                    }`}
                  >
                    <span className="truncate">{obj.name}</span>
                    <span className="text-[10px] font-mono-tabular text-[#8e95a2] shrink-0">
                      {obj.shading === 'smooth' ? 'Suave' : 'Plano'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Shading Flat / Smooth toggle */}
        {activeMeshObj && (
          <div className="grid grid-cols-2 gap-1 pt-0.5">
            <button
              type="button"
              onClick={() => onSetObjectShading(activeMeshObj.id, 'flat')}
              className={`h-7 rounded border text-[11px] font-semibold transition-colors ${
                activeMeshObj.shading !== 'smooth'
                  ? 'bg-[#2c313b] border-[#5ecd6e]/65 text-[#5ecd6e]'
                  : 'bg-[#1c1f26] border-[#2b2e36] text-[#9ca3af] hover:text-white'
              }`}
            >
              Sombreado Plano
            </button>
            <button
              type="button"
              onClick={() => onSetObjectShading(activeMeshObj.id, 'smooth')}
              className={`h-7 rounded border text-[11px] font-semibold transition-colors ${
                activeMeshObj.shading === 'smooth'
                  ? 'bg-[#2c313b] border-[#5ecd6e]/65 text-[#5ecd6e]'
                  : 'bg-[#1c1f26] border-[#2b2e36] text-[#9ca3af] hover:text-white'
              }`}
            >
              Sombreado Suave
            </button>
          </div>
        )}
      </div>

      {/* Existing Real PBR MaterialPanel */}
      <div className="flex-1 min-h-0 overflow-y-auto cad-scroll p-3">
        <MaterialPanel
          materials={materials}
          selectedObject={selectedObject}
          selectedObjectIds={selectedObjectIds}
          objects={objects}
          displayMode={displayMode}
          onActivateMaterialPreview={onActivateMaterialPreview}
          onCreateMaterial={onCreateMaterial}
          onRenameMaterial={onRenameMaterial}
          onPushMaterialHistory={onPushMaterialHistory}
          onUpdateMaterial={onUpdateMaterial}
          onDuplicateMaterial={onDuplicateMaterial}
          onDeleteMaterial={onDeleteMaterial}
          onAssignMaterialToObjects={onAssignMaterialToObjects}
        />
      </div>
    </aside>
  );
};
