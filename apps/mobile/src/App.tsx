import "react-native-gesture-handler";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { registerRootComponent } from "expo";
import AppNavigator from "./navigation/AppNavigator";
import AuthNavigator from "./navigation/AuthNavigator";
import { useAuth } from "./hooks/useAuth";
import { store } from "./store";
import { colors } from "./theme/colors";

const AppShell = () => {
  const { session, isBootstrapping, bootstrap } = useAuth();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (isBootstrapping) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <NavigationContainer>{session ? <AppNavigator /> : <AuthNavigator />}</NavigationContainer>;
};

const RootApp = () => (
  <Provider store={store}>
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  </Provider>
);

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background
  }
});

registerRootComponent(RootApp);

export default RootApp;
