import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Redirect,
  Switch,
} from 'react-router-dom';
import qs from 'query-string';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/styles';
import { User } from '@caravan/buddy-reading-types';
import Footer from './components/Footer';
import Club from './views/club/Club';
import CreateClub from './views/club/CreateClub';
import Home from './views/home/Home';
import Onboarding from './views/onboarding/Onboarding';
import FindBooks from './views/books/FindBooks';
import Privacy from './views/privacy/Privacy';
import UpdateBook from './views/club/UpdateBook';
import UserView from './views/user/User';
import {
  clearStorageAuthState,
  KEY_DISCORD_OAUTH_STATE,
  KEY_USER,
} from './common/localStorage';
import { deleteCookie, getCookie } from './common/cookies';
import { GAListener } from './common/GAListener';
import theme from './theme';
import { getUser } from './services/user';

const trackingId =
  process.env.NODE_ENV === 'production' ? 'UA-142888065-1' : undefined;

interface AppProps {}

const HomeRedirect = () => {
  return <Redirect to="/clubs" />;
};

const forceOnboard = (user: User | null, route: JSX.Element) => {
  if (user && user.onboardingVersion === 0) {
    return <Redirect to="/onboarding" />;
  }
  return route;
};

const forceOutOfOnboard = (user: User | null, route: JSX.Element) => {
  if (!user || user.onboardingVersion === 1) {
    return <Redirect to="/clubs" />;
  }
  return route;
};

export function App(props: AppProps) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    if (!user) {
      const cachedUserStr = localStorage.getItem(KEY_USER);
      let cachedUser: User | null = null;
      if (cachedUserStr) {
        cachedUser = JSON.parse(cachedUserStr);
        setUser(cachedUser);
      }
      const userId = getCookie('userId');
      if (userId) {
        getUser(userId).then(user => {
          if (user) {
            setUser(user);
            localStorage.setItem(KEY_USER, JSON.stringify(user));
          } else {
            localStorage.removeItem(KEY_USER);
            console.info('Are you having fun messing with cookies? :)');
          }
        });
      }
    }
  }, [user]);

  // Handle the `state` query to verify login
  useEffect(() => {
    const queries = qs.parse(window.location.search);
    if (queries && queries.state) {
      // Someone tampered with the login, remove token
      if (queries.state !== localStorage.getItem(KEY_DISCORD_OAUTH_STATE)) {
        deleteCookie('userId');
      }
      localStorage.removeItem(KEY_DISCORD_OAUTH_STATE);
    }
    if (!getCookie('userId')) {
      clearStorageAuthState();
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <GAListener trackingId={trackingId}>
          <Switch>
            <Route
              exact
              path="/"
              render={props => forceOnboard(user, HomeRedirect())}
            />
            <Route
              exact
              path="/clubs"
              render={props =>
                forceOnboard(user, <Home {...props} user={user} />)
              }
            />
            <Route
              exact
              path="/clubs/create"
              render={props =>
                forceOnboard(user, <CreateClub {...props} user={user} />)
              }
            />
            <Route
              exact
              path="/onboarding"
              render={props =>
                forceOutOfOnboard(user, <Onboarding {...props} user={user} />)
              }
            />
            <Route
              exact
              path="/findbooks"
              render={props => forceOnboard(user, <FindBooks />)}
            />
            <Route
              exact
              path="/privacy"
              render={props => forceOnboard(user, <Privacy />)}
            />
            <Route
              path="/clubs/:id/manage-shelf"
              render={props =>
                forceOnboard(user, <UpdateBook {...props} user={user} />)
              }
            />
            <Route
              path="/clubs/:id"
              render={props =>
                forceOnboard(user, <Club {...props} user={user} />)
              }
            />
            <Route
              path="/user/:id"
              render={props =>
                forceOnboard(user, <UserView {...props} user={user} />)
              }
            />
          </Switch>
          <Footer />
        </GAListener>
      </Router>
    </ThemeProvider>
  );
}

export default App;
