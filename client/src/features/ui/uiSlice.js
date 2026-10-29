import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentCity: 'New York',
  availableCities: ['New York', 'Los Angeles', 'Chicago', 'San Francisco', 'London', 'Toronto'],
  isSidebarOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCurrentCity: (state, action) => {
      state.currentCity = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.isSidebarOpen = action.payload;
    },
  },
});

export const { setCurrentCity, toggleSidebar, setSidebarOpen } = uiSlice.actions;
export default uiSlice.reducer;
