import React, { useState } from 'react';
import './MultiStepForm.css';

interface FamilyStepProps {
  data: any;
  updateData: (data: any) => void;
}

export const FamilyStep: React.FC<FamilyStepProps> = ({ data, updateData }) => {
  const [siblings, setSiblings] = useState(data.events?.siblings || []);
  const [parents, setParents] = useState(data.events?.parents || []);

  // Helper to update parent data
  const updateParent = (relation: 'father' | 'mother', field: string, value: any) => {
    const existingParentIndex = parents.findIndex((p: any) => p.relation === relation);
    let newParents = [...parents];

    if (existingParentIndex >= 0) {
      newParents[existingParentIndex] = { ...newParents[existingParentIndex], [field]: value };
    } else {
      newParents.push({ relation, [field]: value, is_alive: true });
    }
    setParents(newParents);
    updateData({
      ...data,
      events: {
        ...data.events,
        parents: newParents
      }
    });
  };

  // Helper to update sibling data
  const updateSibling = (type: string, count: number) => {
    const existingIndex = siblings.findIndex((s: any) => s.type === type);
    let newSiblings = [...siblings];

    if (existingIndex >= 0) {
      newSiblings[existingIndex] = { ...newSiblings[existingIndex], count };
    } else {
      newSiblings.push({ type, count });
    }
    setSiblings(newSiblings);
    updateData({
      ...data,
      events: {
        ...data.events,
        siblings: newSiblings
      }
    });
  };

  const getParent = (relation: string) => parents.find((p: any) => p.relation === relation) || { is_alive: true };
  const getSiblingCount = (type: string) => siblings.find((s: any) => s.type === type)?.count || 0;

  return (
    <div className="form-step">
      <h3>Family Details (BPHS Verification)</h3>
      <p className="step-description">
        Details about siblings and parents help verify D-3 (Drekkana) and D-12 (Dwadasamsa) charts.
      </p>

      <div className="form-section">
        <h4>Siblings (Co-borns)</h4>
        <div className="input-grid">
          <div className="form-group">
            <label>Elder Brothers</label>
            <input
              type="number"
              min="0"
              value={getSiblingCount('elder_brother')}
              onChange={(e) => updateSibling('elder_brother', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="form-group">
            <label>Elder Sisters</label>
            <input
              type="number"
              min="0"
              value={getSiblingCount('elder_sister')}
              onChange={(e) => updateSibling('elder_sister', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="form-group">
            <label>Younger Brothers</label>
            <input
              type="number"
              min="0"
              value={getSiblingCount('younger_brother')}
              onChange={(e) => updateSibling('younger_brother', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="form-group">
            <label>Younger Sisters</label>
            <input
              type="number"
              min="0"
              value={getSiblingCount('younger_sister')}
              onChange={(e) => updateSibling('younger_sister', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4>Parents</h4>
        
        <div className="parent-section">
          <h5>Father</h5>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={getParent('father').is_alive}
                onChange={(e) => updateParent('father', 'is_alive', e.target.checked)}
              />
              Alive?
            </label>
          </div>
          {!getParent('father').is_alive && (
            <div className="form-group">
              <label>Date of Death</label>
              <input
                type="date"
                value={getParent('father').death_date || ''}
                onChange={(e) => updateParent('father', 'death_date', e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="parent-section">
          <h5>Mother</h5>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={getParent('mother').is_alive}
                onChange={(e) => updateParent('mother', 'is_alive', e.target.checked)}
              />
              Alive?
            </label>
          </div>
          {!getParent('mother').is_alive && (
            <div className="form-group">
              <label>Date of Death</label>
              <input
                type="date"
                value={getParent('mother').death_date || ''}
                onChange={(e) => updateParent('mother', 'death_date', e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
