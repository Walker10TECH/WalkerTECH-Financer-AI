import { registerRootComponent } from 'expo';

import WalkerTECHFinancerAI from './WalkerTECHFinancerAI';

// registerRootComponent calls WalkerTECHFinancerAIRegistry.registerComponent('main', () => WalkerTECHFinancerAI);
// It also ensures that whether you load the WalkerTECHFinancerAI in Expo Go or in a native build,
// the environment is set up WalkerTECHFinancerAIropriately
registerRootComponent(WalkerTECHFinancerAI);
