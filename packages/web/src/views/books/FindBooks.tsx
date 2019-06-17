import React from 'react';
import Container from '@material-ui/core/Container';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import Typography from '@material-ui/core/Typography';
import Grid, { GridSpacing } from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import IconButton from '@material-ui/core/IconButton';
import BackIcon from '@material-ui/icons/ArrowBackIos';
import ThreeDotsIcon from '@material-ui/icons/MoreVert';
import AdapterLink from '../../components/AdapterLink';
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import purple from '@material-ui/core/colors/purple';
import InputBase from '@material-ui/core/InputBase';
import SearchIcon from '@material-ui/icons/Search';

import Header from '../../components/Header';

const theme = createMuiTheme({
  palette: {
    primary: purple,
    secondary: {
      main: '#7289da',
    },
  },
});
const useStyles = makeStyles(theme => ({
  searchContainer: {
    paddingTop: theme.spacing(5),
    paddingBottom: theme.spacing(8),
  },
  backButton: {
    marginRight: theme.spacing(2),
  },
  headerTitle: {
    flexGrow: 1,
    fontWeight: 'bold'
  },
  moreButton: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(0),
  },
  root: {
    padding: '2px 4px',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  input: {
    marginLeft: 8,
    flex: 1,
  },
  iconButton: {
    padding: 10,
  },
}));

export default function FindBooks() {
  const classes = useStyles();

  const leftComponent =
  <IconButton edge="start" className={classes.backButton} color="inherit" aria-label="Back" component={AdapterLink} to="/club/create">
    <BackIcon />
  </IconButton>;

  const centerComponent =
    <Typography variant="h6" className={classes.headerTitle}>
      Find Books
    </Typography>;

  const rightComponent =
    <IconButton edge="start" className={classes.moreButton} color="inherit" aria-label="More" component={AdapterLink} to="/">
      <ThreeDotsIcon />
    </IconButton>;

  const [bookSearchValue, setBookSearchValue] = React.useState('');

  function setSearchField(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setBookSearchValue(e.target.value);
  }

  function bookSearch() {

  }

  return (
    <React.Fragment>
      <CssBaseline />
      <Header leftComponent={leftComponent} centerComponent={centerComponent} rightComponent={rightComponent}/>
      <main>
        <Container className={classes.searchContainer} maxWidth="md">
          <Paper className={classes.root}>
            <IconButton className={classes.iconButton} aria-label="Menu" onClick={() => bookSearch }>
              <SearchIcon />
            </IconButton>
            <InputBase
              className={classes.input}
              placeholder="Search for Books"
              inputProps={{ 'aria-label': 'Search for Books' }}
              onChange={(e) => setSearchField(e)}
            />
          </Paper>
        </Container>
      </main>
    </React.Fragment>
  );
}