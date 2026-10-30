import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedMovie: null,
  selectedTheatre: null,
  selectedDate: new Date().toISOString().split('T')[0],
  selectedShowtime: null,
  selectedSeats: [], // Array of seat objects { id: 'A1', row: 'A', number: 1, type: 'standard', price: 12.50 }
  holdId: null,
  holdExpiresAt: null,
  ticketSubtotal: 0,
  convenienceFee: 1.50,
  selectedFoodItems: [],
  bookingConfirmation: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    selectShow: (state, action) => {
      state.selectedMovie = action.payload.movie;
      state.selectedTheatre = action.payload.theatre;
      state.selectedDate = action.payload.date;
      state.selectedShowtime = action.payload.showtime;
      state.selectedSeats = [];
      state.holdId = null;
      state.holdExpiresAt = null;
      state.ticketSubtotal = 0;
      state.bookingConfirmation = null;
    },
    setSelectedSeats: (state, action) => {
      state.selectedSeats = action.payload;
      state.ticketSubtotal = action.payload.reduce((sum, s) => sum + (s.price || 12.50), 0);
    },
    setSeatHold: (state, action) => {
      state.holdId = action.payload.holdId;
      state.holdExpiresAt = action.payload.expiresAt;
    },
    clearSeatHold: (state) => {
      state.holdId = null;
      state.holdExpiresAt = null;
    },
    toggleSeat: (state, action) => {
      const seat = action.payload;
      const index = state.selectedSeats.findIndex((s) => s.id === seat.id);

      if (index >= 0) {
        state.selectedSeats.splice(index, 1);
      } else {
        // Enforce max 8 seats per booking session
        if (state.selectedSeats.length < 8) {
          state.selectedSeats.push(seat);
        }
      }

      state.ticketSubtotal = state.selectedSeats.reduce((sum, s) => sum + (s.price || 12.50), 0);
    },
    clearSeats: (state) => {
      state.selectedSeats = [];
      state.ticketSubtotal = 0;
      state.holdId = null;
      state.holdExpiresAt = null;
    },
    setBookingConfirmation: (state, action) => {
      state.bookingConfirmation = action.payload;
    },
    resetBookingSession: (state) => {
      state.selectedMovie = null;
      state.selectedTheatre = null;
      state.selectedShowtime = null;
      state.selectedSeats = [];
      state.holdId = null;
      state.holdExpiresAt = null;
      state.ticketSubtotal = 0;
      state.bookingConfirmation = null;
    },
  },
});

export const {
  selectShow,
  setSelectedSeats,
  setSeatHold,
  clearSeatHold,
  toggleSeat,
  clearSeats,
  setBookingConfirmation,
  resetBookingSession,
} = bookingSlice.actions;

export default bookingSlice.reducer;
