import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { moviesApi } from '../../services/api';

export const fetchMovies = createAsyncThunk(
  'movies/fetchMovies',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await moviesApi.getAll(filters);
      return response; // contains { success: true, data: [...], meta: {...} }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch movies');
    }
  }
);

export const fetchMovieById = createAsyncThunk(
  'movies/fetchMovieById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await moviesApi.getById(id);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch movie details');
    }
  }
);

const initialState = {
  movies: [],
  selectedMovie: null,
  meta: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    availableGenres: [],
    availableLanguages: [],
  },
  filters: {
    genre: 'All',
    language: 'All',
    status: 'now_showing',
    search: '',
    sort: 'rating',
    city: 'All',
    theatreId: '',
    date: '',
    page: 1,
  },
  loading: false,
  error: null,
};

const moviesSlice = createSlice({
  name: 'movies',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = {
        genre: 'All',
        language: 'All',
        status: 'now_showing',
        search: '',
        sort: 'rating',
        city: 'All',
        theatreId: '',
        date: '',
        page: 1,
      };
    },
    clearSelectedMovie: (state) => {
      state.selectedMovie = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchMovies
      .addCase(fetchMovies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMovies.fulfilled, (state, action) => {
        state.loading = false;
        state.movies = action.payload.data || [];
        if (action.payload.meta) {
          state.meta = action.payload.meta;
        }
      })
      .addCase(fetchMovies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchMovieById
      .addCase(fetchMovieById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMovieById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedMovie = action.payload;
      })
      .addCase(fetchMovieById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, resetFilters, clearSelectedMovie } = moviesSlice.actions;
export default moviesSlice.reducer;
