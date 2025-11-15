export interface Character {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  targetPosition: {
    x: number;
    y: number;
  };
  gridPosition: {
    gridX: number;
    gridY: number;
  };
  speed: number;
  isMoving: boolean;
  lastEvaluation?: {
    location: string;
    keywords: string[];
    evaluation: string;
    timestamp: number;
  };
  personality: ArtistPersonality;
  trajectory: TrajectoryPoint[];
  currentTrajectoryIndex: number;
}

export interface ArtistPersonality {
  name: string;
  background: string;
  artisticStyle: string;
  criticalPerspective: string;
  evaluationPrompts: {
    locationAnalysis: string;
    keywordInterpretation: string;
    culturalCritique: string;
  };
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  waitTime?: number; // milliseconds to wait at this point
  action?: 'evaluate' | 'observe' | 'move';
  speed?: number; // pixels per second - variable speed for elegant movement
}

export interface LocationEvaluation {
  position: {
    x: number;
    y: number;
    gridX: number;
    gridY: number;
  };
  keywords: string[];
  contextualKeywords: string[];
  evaluation: {
    artistic: string;
    cultural: string;
    critique: string;
  };
  timestamp: number;
  characterId: string;
}

export interface CharacterMovementState {
  character: Character;
  isEvaluating: boolean;
  nextEvaluationTime: number;
  evaluationHistory: LocationEvaluation[];
}