export type Movie = { title: string; price: string; format: string; showtimes: string[] };

export const MOVIES: Movie[] = [
  { title: 'Dune: Part Two', price: '$15.99', format: 'IMAX', showtimes: ['10:00', '14:30', '19:00', '22:30'] },
  { title: 'Oppenheimer', price: '$13.99', format: 'IMAX', showtimes: ['11:00', '15:00', '19:30'] },
  { title: 'Inside Out 2', price: '$11.99', format: '2D', showtimes: ['09:30', '12:00', '15:30', '18:00'] },
  { title: 'Deadpool & Wolverine', price: '$14.99', format: '3D', showtimes: ['10:30', '14:00', '18:30', '21:30'] },
  { title: 'The Batman', price: '$12.99', format: '2D', showtimes: ['12:30', '16:00', '20:00'] },
  { title: 'Spider-Man: No Way Home', price: '$12.99', format: '3D', showtimes: ['11:30', '15:30', '19:30'] },
  { title: 'Avatar: The Way of Water', price: '$16.99', format: 'IMAX 3D', showtimes: ['10:00', '14:00', '18:00', '22:00'] },
  { title: 'Barbie', price: '$10.99', format: '2D', showtimes: ['09:00', '12:30', '16:30', '20:30'] },
];
