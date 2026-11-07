import { createBrowserRouter } from 'react-router'
import { RequireAuth } from '../features/auth/RequireAuth'
import { AdminPage } from '../pages/AdminPage'
import { AgentHomePage, AgentLeadPage } from '../pages/AgentPages'
import { LoginPage, RegisterPage, VerifyEmailPage } from '../pages/AuthPages'
import {
  DestinationPage,
  DestinationsPage,
  GuidePage,
  ItinerariesPage,
  ItineraryPage,
} from '../pages/ContentPages'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { MyTripsPage, PlanTripPage, TripPage } from '../pages/TravellerPages'
import { Layout } from './Layout'

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'destinations', element: <DestinationsPage /> },
      { path: 'destinations/:slug', element: <DestinationPage /> },
      { path: 'itineraries', element: <ItinerariesPage /> },
      { path: 'itineraries/:slug', element: <ItineraryPage /> },
      { path: 'safety', element: <GuidePage slug="safety" /> },
      { path: 'food', element: <GuidePage slug="food" /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      {
        path: 'plan',
        element: (
          <RequireAuth role="TRAVELLER" verified>
            <PlanTripPage />
          </RequireAuth>
        ),
      },
      { path: 'trips', element: <RequireAuth role="TRAVELLER"><MyTripsPage /></RequireAuth> },
      { path: 'trips/:id', element: <RequireAuth role="TRAVELLER"><TripPage /></RequireAuth> },
      { path: 'agent', element: <RequireAuth role="AGENT" verified><AgentHomePage /></RequireAuth> },
      { path: 'agent/leads/:matchId', element: <RequireAuth role="AGENT" verified><AgentLeadPage /></RequireAuth> },
      { path: 'admin', element: <RequireAuth role="ADMIN" verified><AdminPage /></RequireAuth> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

/** Created lazily so the pre-render step can import the routes without a browser. */
export const createRouter = () => createBrowserRouter(routes)
