import React, { useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  User,
  GoogleBooks,
  ShelfEntry,
  FilterAutoMongoKeys,
  ReadingSpeed,
  GroupVibe,
  Services,
} from '@caravan/buddy-reading-types';
import {
  makeStyles,
  createMuiTheme,
  MuiThemeProvider,
} from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Radio from '@material-ui/core/Radio';
import purple from '@material-ui/core/colors/purple';
import BackIcon from '@material-ui/icons/ArrowBackIos';
import ThreeDotsIcon from '@material-ui/icons/MoreVert';
import Switch from '@material-ui/core/Switch';
import Grid from '@material-ui/core/Grid';
import { withStyles } from '@material-ui/core/styles';
import AdapterLink from '../../components/AdapterLink';
import Header from '../../components/Header';
import { createClub } from '../../services/club';
import BookSearch from '../books/BookSearch';
import {
  readingSpeedIcons,
  readingSpeedLabels,
} from '../../components/reading-speed-avatars-icons-labels';
import {
  groupVibeIcons,
  groupVibeLabels,
} from '../../components/group-vibe-avatars-icons-labels';
import { getShelfFromGoogleBooks } from './functions/ClubFunctions';

const theme = createMuiTheme({
  palette: {
    primary: purple,
    secondary: {
      main: '#7289da',
    },
  },
});

const useStyles = makeStyles(theme => ({
  formContainer: {
    paddingTop: theme.spacing(5),
    paddingBottom: theme.spacing(5),
  },
  addButton: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginRight: theme.spacing(2),
  },
  headerTitle: {
    flexGrow: 1,
    fontWeight: 'bold',
  },
  createButton: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginRight: 16,
    marginBottom: 10,
    color: 'white',
    backgroundColor: '#7289da',
  },
  createButtonSection: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0px',
  },
  progress: {
    margin: theme.spacing(2),
  },
  moreButton: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(0),
  },
}));

interface CreateClubRouteParams {
  id: string;
}

interface CreateClubProps extends RouteComponentProps<CreateClubRouteParams> {
  user: User | null;
}

export default function CreateClub(props: CreateClubProps) {
  const classes = useStyles();

  const leftComponent = (
    <IconButton
      edge="start"
      className={classes.backButton}
      color="inherit"
      aria-label="Back"
      component={AdapterLink}
      to="/"
    >
      <BackIcon />
    </IconButton>
  );

  const centerComponent = (
    <Typography variant="h6" className={classes.headerTitle}>
      Create a Group
    </Typography>
  );

  const rightComponent = (
    <IconButton
      edge="start"
      className={classes.moreButton}
      color="inherit"
      aria-label="More"
      component={AdapterLink}
      to="/"
    >
      <ThreeDotsIcon />
    </IconButton>
  );

  const [selectedGroupSize, setSelectedGroupSize] = React.useState<number>(4);
  const [selectedGroupSpeed, setSelectedGroupSpeed] = React.useState<
    ReadingSpeed
  >('moderate');
  const [selectedGroupVibe, setSelectedGroupVibe] = React.useState<GroupVibe>(
    'chill'
  );
  const [selectedGroupName, setSelectedGroupName] = React.useState('');
  const [selectedGroupBio, setSelectedGroupBio] = React.useState('');
  const [selectedBooks, setSelectedBooks] = React.useState<GoogleBooks.Item[]>(
    []
  );
  const [bookToRead, setBookToRead] = React.useState<GoogleBooks.Item | null>(
    null
  );
  const [privateClub, setPrivateClub] = React.useState(false);
  const [creatingClub, setCreatingClub] = React.useState(false);
  const [
    createdClub,
    setCreatedClub,
  ] = React.useState<Services.CreateClubResult | null>(null);

  function onSubmitSelectedBooks(
    selectedBooks: GoogleBooks.Item[],
    bookToRead: GoogleBooks.Item
  ) {
    setSelectedBooks(selectedBooks);
    setBookToRead(bookToRead);
  }

  useEffect(() => {
    if (createdClub) {
      props.history.replace(`/club/${createdClub.club._id}`);
    }
  }, [createdClub]);

  async function createClubOnClick() {
    if (!bookToRead) {
      return;
    }
    const shelf = getShelfFromGoogleBooks(
      selectedBooks,
      bookToRead.id
    ) as ShelfEntry[];
    const clubObj: any = {
      name: selectedGroupName,
      shelf,
      bio: selectedGroupBio,
      maxMembers: selectedGroupSize,
      vibe: selectedGroupVibe,
      readingSpeed: selectedGroupSpeed,
      channelSource: 'discord',
      private: privateClub,
    };
    setCreatingClub(true);
    const createdClubRes = await createClub(clubObj);
    const { data } = createdClubRes;
    if (data) {
      setCreatedClub(data);
    }
  }

  const AntSwitch = withStyles(theme => ({
    root: {
      width: 28,
      height: 16,
      padding: 0,
      display: 'flex',
    },
    switchBase: {
      padding: 2,
      color: theme.palette.grey[500],
      '&$checked': {
        transform: 'translateX(12px)',
        color: theme.palette.common.white,
        '& + $track': {
          opacity: 1,
          backgroundColor: '#7289da',
          borderColor: '#7289da',
        },
      },
    },
    thumb: {
      width: 12,
      height: 12,
      boxShadow: 'none',
    },
    track: {
      border: `1px solid ${theme.palette.grey[500]}`,
      borderRadius: 16 / 2,
      opacity: 1,
      backgroundColor: theme.palette.common.white,
    },
    checked: {},
  }))(Switch);

  return (
    <React.Fragment>
      <CssBaseline />
      <Header
        leftComponent={leftComponent}
        centerComponent={centerComponent}
        rightComponent={rightComponent}
      />
      <main>
        <Container className={classes.formContainer} maxWidth="md">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              style={{ marginBottom: 20, fontSize: 16, color: '#8B8B8B' }}
              variant="subtitle1"
            >
              Visibility level
            </Typography>
            <div
              style={{
                marginBottom: '30px',
              }}
            >
              <Typography component="div">
                <Grid
                  component="label"
                  container
                  alignItems="center"
                  spacing={1}
                >
                  <Grid item style={{ fontSize: 24, color: '#4B4B4B' }}>
                    Public
                  </Grid>
                  <Grid item>
                    <AntSwitch
                      checked={privateClub}
                      onChange={(e, checked) => setPrivateClub(checked)}
                      value="checked"
                    />
                  </Grid>
                  <Grid item style={{ fontSize: 24, color: '#4B4B4B' }}>
                    Private
                  </Grid>
                </Grid>
              </Typography>
            </div>
          </div>
          <TextField
            id="filled-name"
            label="Group Name"
            style={{ marginBottom: 20, marginTop: 40 }}
            helperText="50 character limit"
            variant="outlined"
            fullWidth
            inputProps={{ maxLength: 50 }}
            onChange={(
              e: React.ChangeEvent<
                HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
              >
            ) => setSelectedGroupName(e.target.value)}
          />
          <Typography
            style={{ marginBottom: 10, fontSize: 16, color: '#8B8B8B' }}
            variant="subtitle1"
          >
            What books would you like to read?
          </Typography>
          <BookSearch onSubmitBooks={onSubmitSelectedBooks} maxSelected={5} />
          <Typography
            style={{ marginBottom: 10, fontSize: 16, color: '#8B8B8B' }}
            variant="subtitle1"
            component="h2"
          >
            How many group members do you want?
          </Typography>
          <div style={{ marginBottom: 20 }}>
            <MuiThemeProvider theme={theme}>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <Radio
                  checked={selectedGroupSize === 2}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupSize(Number.parseInt(event.target.value))
                  }
                  value="2"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': '2' }}
                />
                <Radio
                  checked={selectedGroupSize === 3}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupSize(Number.parseInt(event.target.value))
                  }
                  value="3"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': '3' }}
                />
                <Radio
                  checked={selectedGroupSize === 4}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupSize(Number.parseInt(event.target.value))
                  }
                  value="4"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': '4' }}
                />
                <Radio
                  checked={selectedGroupSize === 5}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupSize(Number.parseInt(event.target.value))
                  }
                  value="5"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': '5' }}
                />
                <Radio
                  checked={selectedGroupSize === 6}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupSize(Number.parseInt(event.target.value))
                  }
                  value="6"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': '6' }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  marginBottom: 20,
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  color: '#4B4B4B',
                }}
              >
                <Typography variant="h5" component="h2">
                  2
                </Typography>
                <Typography variant="h5" component="h2">
                  3
                </Typography>
                <Typography variant="h5" component="h2">
                  4
                </Typography>
                <Typography variant="h5" component="h2">
                  5
                </Typography>
                <Typography variant="h5" component="h2">
                  6
                </Typography>
              </div>
            </MuiThemeProvider>
          </div>

          <Typography
            style={{ marginBottom: 30, fontSize: 16, color: '#8B8B8B' }}
            variant="subtitle1"
            component="h2"
          >
            How fast do you want the group to read?
          </Typography>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: '80%',
              marginBottom: 30,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {readingSpeedIcons('slow', 'icon')}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Radio
                  checked={selectedGroupSpeed === 'slow'}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupSpeed(event.target.value as ReadingSpeed)
                  }
                  value="slow"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': 'Slow' }}
                />
                <Typography
                  style={{ marginLeft: 10, color: '#4B4B4B' }}
                  variant="h5"
                  component="h2"
                >
                  A book a month
                </Typography>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {readingSpeedIcons('moderate', 'icon')}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Radio
                  checked={selectedGroupSpeed === 'moderate'}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupSpeed(event.target.value as ReadingSpeed)
                  }
                  value="moderate"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': 'Moderate' }}
                />
                <Typography
                  style={{ marginLeft: 10, color: '#4B4B4B' }}
                  variant="h5"
                  component="h2"
                >
                  One book every couple of weeks
                </Typography>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {readingSpeedIcons('fast', 'icon')}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Radio
                  checked={selectedGroupSpeed === 'fast'}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupSpeed(event.target.value as ReadingSpeed)
                  }
                  value="fast"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': 'Fast' }}
                />
                <Typography
                  style={{ marginLeft: 10, color: '#4B4B4B' }}
                  variant="h5"
                  component="h2"
                >
                  One or more books a week
                </Typography>
              </div>
            </div>
          </div>

          <Typography
            style={{ marginBottom: 30, fontSize: 16, color: '#8B8B8B' }}
            variant="subtitle1"
            component="h2"
          >
            What vibe do you want the group to have?
          </Typography>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: '80%',
              marginBottom: 30,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {groupVibeIcons('chill', 'icon')}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Radio
                  checked={selectedGroupVibe === 'chill'}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupVibe(event.target.value as GroupVibe)
                  }
                  value="chill"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': 'Chill' }}
                />
                <Typography
                  style={{ marginLeft: 10, color: '#4B4B4B' }}
                  variant="h5"
                  component="h2"
                >
                  {groupVibeLabels('chill')}
                </Typography>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {groupVibeIcons('nerdy', 'icon')}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Radio
                  checked={selectedGroupVibe === 'nerdy'}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupVibe(event.target.value as GroupVibe)
                  }
                  value="nerdy"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': 'Nerdy' }}
                />
                <Typography
                  style={{ marginLeft: 10, color: '#4B4B4B' }}
                  variant="h5"
                  component="h2"
                >
                  {groupVibeLabels('nerdy')}
                </Typography>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {groupVibeIcons('power', 'icon')}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Radio
                  checked={selectedGroupVibe === 'power'}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupVibe(event.target.value as GroupVibe)
                  }
                  value="power"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': 'Power' }}
                />
                <Typography
                  style={{ marginLeft: 10, color: '#4B4B4B' }}
                  variant="h5"
                  component="h2"
                >
                  {groupVibeLabels('power')}
                </Typography>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {groupVibeIcons('first-timers', 'icon')}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Radio
                  checked={selectedGroupVibe === 'first-timers'}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupVibe(event.target.value as GroupVibe)
                  }
                  value="first-timers"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': 'FirstTimer' }}
                />
                <Typography
                  style={{ marginLeft: 10, color: '#4B4B4B' }}
                  variant="h5"
                  component="h2"
                >
                  {groupVibeLabels('first-timers')}
                </Typography>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {groupVibeIcons('learning', 'icon')}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Radio
                  checked={selectedGroupVibe === 'learning'}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedGroupVibe(event.target.value as GroupVibe)
                  }
                  value="learning"
                  style={{ color: '#7289da' }}
                  name="radio-button-demo"
                  inputProps={{ 'aria-label': 'Learning' }}
                />
                <Typography
                  style={{ marginLeft: 10, color: '#4B4B4B' }}
                  variant="h5"
                  component="h2"
                >
                  {groupVibeLabels('learning')}
                </Typography>
              </div>
            </div>
          </div>

          <TextField
            id="multiline-full-width"
            style={{ marginBottom: 20, width: '100%' }}
            placeholder="Group Bio"
            helperText="300 character limit"
            variant="outlined"
            onChange={(
              e: React.ChangeEvent<
                HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
              >
            ) => setSelectedGroupBio(e.target.value)}
            multiline
            rows="4"
            inputProps={{ maxLength: 300 }}
            InputLabelProps={{
              shrink: true,
            }}
          />
          <div className={classes.createButtonSection}>
            {creatingClub ? (
              <CircularProgress className={classes.progress} />
            ) : null}
            <Button
              variant="contained"
              disabled={
                selectedGroupBio === '' ||
                selectedGroupName === '' ||
                !bookToRead ||
                selectedBooks.length === 0
              }
              className={classes.createButton}
              size="small"
              onClick={createClubOnClick}
            >
              Create
            </Button>
          </div>
        </Container>
      </main>
    </React.Fragment>
  );
}
