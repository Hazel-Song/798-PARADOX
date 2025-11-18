import { TimelineData } from '@/types';

export const timelineData: TimelineData = {
  periods: [
    {
      id: 'period-1',
      name: 'Silence and Reconstruction',
      years: '1995–2002',
      description: 'Artists\' self-invention in abandoned industrial ruins — they sow seeds in silent metal, rewriting spatial meaning through self-organization. No audience, no institutions, only tin sheets, light shadows, and spontaneous creation.'
    },
    {
      id: 'period-2',
      name: 'Confrontation and Naming',
      years: '2002-2006',
      description: '798 enters the period of "being seen" — artists and government gaze at each other. Naming means control, resistance means existence. Artists delay demolition through festivals, exhibitions, and public discourse, while government redefines order through boundaries and approvals.'
    },
    {
      id: 'period-3',
      name: 'Illusion of Freedom',
      years: '2006–2010',
      description: 'The arrival of markets and tourists changes the ecology of the art district. Freedom becomes a label, creation becomes industry. Government management logic intertwines with capital interests into new complicity, squeezing artists between legitimacy and alienation, continuing to wander.'
    },
    {
      id: 'period-4',
      name: 'Migration and Circulation',
      years: '2010–2017',
      description: 'Artists flow from center to periphery, then are swallowed by the periphery. Their studios are demolished, communities erased. The city replicates successful models while also replicating forgetfulness. 798 becomes merely a prosperous art park.'
    }
  ],
  rolesByPeriod: {
    'period-1': {
      artist: {
        name: 'Artist',
        description: 'Transform abandoned industrial ruins into artistic spaces',
        actions: ['buildings', 'intuition and imagination', 'blocks and communities']
      }
    },
    'period-2': {
      artist: {
        name: 'Artist',
        description: 'Realizes existence has been "systematized", creation shifts from spontaneous to strategic',
        actions: ['buildings', 'intuition and imagination', 'blocks and communities', 'organize exhibitions, "occupy" evaluated spaces to delay clearance', 'peripheral clusters']
      },
      government: {
        name: 'Government',
        description: 'Based on urban planning, evaluate, organize and define "usable space"',
        actions: ['scan maps, delineate boundaries', 'assess and demolish']
      }
    },
    'period-3': {
      artist: {
        name: 'Artist',
        description: 'Surrounded by commerce, continue creating while facing rent, tourists and government oversight',
        actions: ['buildings', 'intuition and imagination', 'blocks and communities', 'galleries', 'seek "quiet zones" in blank areas']
      },
      government: {
        name: 'Government',
        description: 'No longer clears artists but "selectively displays" them, maintaining "controlled freedom": art must be packaged and consumed',
        actions: ['designate art district', 'continuous debate with artists in symbolic areas', 'assess and demolish']
      },
      visitor: {
        name: 'Visitor',
        description: 'Chase hotspots, changing art district meaning: from creation to consumption',
        actions: ['approach galleries (high-profile artists)']
      }
    },
    'period-4': {
      artist: {
        name: 'Artist',
        description: 'Leave traces, flow, move to more peripheral areas',
        actions: []
      },
      government: {
        name: 'Government',
        description: 'Expanding urban system, logic is resources and control, judgment criteria for "artist points" no longer cultural value but safety and compliance',
        actions: []
      },
      visitor: {
        name: 'Visitor',
        description: 'Continuous influx',
        actions: []
      }
    }
  }
};