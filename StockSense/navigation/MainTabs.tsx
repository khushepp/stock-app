import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../App';
import NewsScreen from '../NewsScreen';
import PortfolioScreen from '../PortfolioScreen';
import ProfileScreen from '../ProfileScreen';
import AgentModeScreen from '../AgentModeScreen';

const Tab = createBottomTabNavigator();

const MainTabs = ({ onLogout }: { onLogout: () => void }) => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    <Tab.Screen name="Home">
      {props => <HomeScreen {...props} onLogout={onLogout} />}
    </Tab.Screen>
    <Tab.Screen name="News" component={NewsScreen} />
    <Tab.Screen name="Portfolio" component={PortfolioScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
    <Tab.Screen name="AgentMode" component={AgentModeScreen} options={{ title: 'Agent Mode' }} />
  </Tab.Navigator>
);

export default MainTabs; 