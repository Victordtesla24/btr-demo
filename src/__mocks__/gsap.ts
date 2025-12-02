/**
 * GSAP Mock for Jest Tests
 *
 * Centralised manual mock used whenever tests call `jest.mock('gsap')`.
 * Provides the subset of the GSAP API we use in components and tests,
 * including `timeline()` so components like LoadingOverlay can create
 * timelines safely during unit/integration tests.
 */

const createTweenLike = () => ({
  kill: jest.fn(),
});

const createTimelineLike = () => ({
  to: jest.fn(createTweenLike),
  from: jest.fn(createTweenLike),
  fromTo: jest.fn(createTweenLike),
  set: jest.fn(),
  kill: jest.fn(),
});

const gsapMock = {
  set: jest.fn(),
  to: jest.fn(createTweenLike),
  from: jest.fn(createTweenLike),
  fromTo: jest.fn(createTweenLike),
  timeline: jest.fn(createTimelineLike),
  registerPlugin: jest.fn(),
  killTweensOf: jest.fn(),
};

export default gsapMock;
