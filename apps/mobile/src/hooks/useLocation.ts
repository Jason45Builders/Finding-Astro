import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { Coordinates } from "../types/animal.types";
import { defaultCoordinates } from "../utils/geo";

interface LocationState {
  currentLocation: Coordinates;
  loading: boolean;
  error: string | null;
  permissionGranted: boolean;
}

export const useLocation = () => {
  const [state, setState] = useState<LocationState>({
    currentLocation: defaultCoordinates,
    loading: true,
    error: null,
    permissionGranted: false
  });

  const refresh = useCallback(async (): Promise<Coordinates> => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setState((current) => ({
          ...current,
          loading: false,
          permissionGranted: false,
          error: "Location permission was denied. Using default city coordinates."
        }));
        return defaultCoordinates;
      }

      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const coordinates = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude
      };

      setState({
        currentLocation: coordinates,
        loading: false,
        error: null,
        permissionGranted: true
      });

      return coordinates;
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        permissionGranted: false,
        error: error instanceof Error ? error.message : "Unable to resolve current location."
      }));
      return defaultCoordinates;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    refresh
  };
};
