import React from 'react';
import { CircularProgress, createMuiTheme, Avatar } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import {
  makeStyles,
  responsiveFontSizes,
  MuiThemeProvider,
} from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import DiscordLoginModal from '../../components/DiscordLoginModal';
import { User, Services } from '@caravan/buddy-reading-types';
import AdapterLink from '../../components/AdapterLink';
import theme, { makeUserTheme, makeUserDarkTheme } from '../../theme';
import GenresInCommonChips from '../../components/GenresInCommonChips';
import UserCardShelfList from '../club/shelf-view/UserCardShelfList';
import { InviteToClubMenu } from '../../components/InviteToClubMenu';
import { getUserClubs, getClubMembers } from '../../services/club';
import { UserWithInvitableClubs } from './Home';
import UserAvatar from '../user/UserAvatar';
import GenericGroupMemberAvatar from '../../components/misc-avatars-icons-labels/avatars/GenericGroupMemberAvatar';

const useStyles = makeStyles(theme => ({
  cardGrid: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(8),
  },
  gridItem: {
    marginBottom: theme.spacing(4),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    marginTop: theme.spacing(2),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
  cardContent: {
    position: 'relative',
    zIndex: 1,
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    paddingBottom: 0,
  },
  iconWithLabel: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLabel: {
    marginLeft: 8,
  },
  iconRoot: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    margin: 0,
  },
  button: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
  userHeading: {
    position: 'relative',
    height: '100px',
    width: '100%',
  },
  userHeadingNoPalette: {
    position: 'relative',
    height: '100px',
    width: '100%',
    'border-style': 'solid',
    'border-color': '#5C6BC0',
    'border-width': '0px 0px 2px 0px',
  },
  userTextContainer: {
    position: 'absolute',
    width: '100%',
    bottom: 10,
    left: 10,
    padding: theme.spacing(2),
  },
  userNameText: {
    fontWeight: 600,
    width: '74%',
  },
  userWebsiteText: {},
  userAvatarContainer: {
    position: 'absolute',
    top: 32,
    right: 16,
    zIndex: 1,
    borderRadius: '50%',
    padding: 3,
    backgroundColor: '#FFFFFF',
  },
  fieldTitleText: {
    fontStyle: 'italic',
    marginTop: theme.spacing(1),
  },
  genresInCommon: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  emptyFieldText: {},
  clubImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    'object-fit': 'cover',
    'object-position': '50% 50%',
    filter: 'blur(4px)',
  },
  clubImageShade: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    background: 'rgba(0, 0, 0, 0.4)',
  },
  imageText: {
    width: '100%',
    'text-align': 'left',
    color: '#ffffff',
  },
  imageTitleText: {
    width: '100%',
    'text-align': 'left',
    color: '#ffffff',
    fontWeight: 600,
  },
  progress: {
    margin: theme.spacing(2),
  },
}));

interface UserCardProps {
  usersWithInvitableClubs: UserWithInvitableClubs[];
  user: User | null;
  userClubs: Services.GetClubs['clubs'];
}

export default function UserCards(props: UserCardProps) {
  const classes = useStyles();
  const { usersWithInvitableClubs, user, userClubs } = props;

  const [loginModalShown, setLoginModalShown] = React.useState(false);
  const [visitProfileLoadingId] = React.useState('');
  const [inviteToClubMenuShown, setInviteToClubMenuShown] = React.useState(
    false
  );

  const onCloseLoginDialog = () => {
    setLoginModalShown(false);
  };

  let myGenres: string[] = [];
  if (user) {
    myGenres = user.selectedGenres.map(x => x.name);
  }

  return (
    <main>
      <Container className={classes.cardGrid} maxWidth="md">
        <Grid container spacing={4}>
          {usersWithInvitableClubs.map(u => {
            const userTheme = makeUserTheme(u.user.palette);

            const userDarkTheme = makeUserDarkTheme(u.user.palette);

            const otherUsersGenres: string[] = u.user.selectedGenres.map(
              x => x.name
            );

            const otherGenresSet = new Set(otherUsersGenres);
            const myGenresSet = new Set(myGenres);
            let commonGenres = Array.from(
              //@ts-ignore
              new Set([...otherGenresSet].filter(val => myGenresSet.has(val)))
            );

            commonGenres = commonGenres.slice(
              0,
              Math.min(commonGenres.length, 5)
            );

            let otherUniqueGenres: string[] = [];
            if (commonGenres.length < 5) {
              otherUniqueGenres = otherUsersGenres.filter(
                val => !myGenres.includes(val)
              );
              otherUniqueGenres = otherUniqueGenres.slice(
                0,
                Math.min(5 - commonGenres.length, 5)
              );
            }

            const nameField: string = u.user.name
              ? u.user.name
              : u.user.urlSlug
              ? u.user.urlSlug
              : 'noName';

            return (
              <MuiThemeProvider theme={userTheme}>
                <Grid
                  item
                  key={u.user._id}
                  xs={12}
                  sm={6}
                  className={classes.gridItem}
                  justify="space-around"
                >
                  <Card className={classes.card}>
                    <div
                      className={classes.userHeading}
                      style={{
                        backgroundColor: userTheme
                          ? userTheme.palette.primary.main
                          : theme.palette.primary.main,
                      }}
                    >
                      <div className={classes.userTextContainer}>
                        <MuiThemeProvider theme={userDarkTheme || theme}>
                          <Typography
                            variant="h5"
                            className={classes.userNameText}
                            color="primary"
                            style={
                              !userDarkTheme
                                ? {
                                    color: theme.palette.common.white,
                                  }
                                : undefined
                            }
                          >
                            {nameField}
                          </Typography>
                        </MuiThemeProvider>
                      </div>
                    </div>
                    <CardContent classes={{ root: classes.cardContent }}>
                      <Typography
                        gutterBottom
                        className={classes.fieldTitleText}
                        color="textSecondary"
                      >
                        Genres
                      </Typography>
                      {otherUsersGenres.length > 0 && (
                        <div className={classes.genresInCommon}>
                          {commonGenres.map(genre => (
                            <GenresInCommonChips
                              name={genre}
                              backgroundColor={
                                userTheme
                                  ? userTheme.palette.primary.main
                                  : theme.palette.primary.main
                              }
                              common={true}
                            />
                          ))}
                          {otherUniqueGenres.map(genre => (
                            <GenresInCommonChips
                              name={genre}
                              backgroundColor={
                                userTheme
                                  ? userTheme.palette.primary.main
                                  : theme.palette.primary.main
                              }
                              common={false}
                            />
                          ))}
                        </div>
                      )}
                      {otherUsersGenres.length === 0 && (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            height: 36,
                          }}
                        >
                          <Typography
                            variant="body1"
                            className={classes.emptyFieldText}
                            color="textSecondary"
                          >
                            User has no genres...
                          </Typography>
                        </div>
                      )}
                      <Typography
                        gutterBottom
                        className={classes.fieldTitleText}
                        color="textSecondary"
                      >
                        Shelf
                      </Typography>
                      {u.user.shelf.notStarted.length > 0 && (
                        <UserCardShelfList shelf={u.user.shelf.notStarted} />
                      )}
                      {u.user.shelf.notStarted.length === 0 && (
                        <Typography
                          variant="body1"
                          className={classes.emptyFieldText}
                          color="textSecondary"
                        >
                          User has no books on their shelf...
                        </Typography>
                      )}
                      {u.user.questions && u.user.questions.length > 0 && (
                        <>
                          <Typography
                            className={classes.fieldTitleText}
                            color="textSecondary"
                            gutterBottom
                          >
                            {u.user.questions[0].title}
                          </Typography>
                          <Typography
                            variant="body1"
                            className={classes.emptyFieldText}
                          >
                            {u.user.questions[0].answer}
                          </Typography>
                        </>
                      )}
                      {!u.user.questions ||
                        (u.user.questions.length === 0 && (
                          <>
                            <Typography
                              className={classes.fieldTitleText}
                              color="textSecondary"
                              gutterBottom
                            >
                              Profile questions
                            </Typography>
                            <Typography
                              variant="body1"
                              className={classes.emptyFieldText}
                              color="textSecondary"
                            >
                              User hasn't answered any profile questions yet...
                            </Typography>
                          </>
                        ))}
                    </CardContent>
                    <CardActions classes={{ root: classes.cardActions }}>
                      <Button
                        className={classes.button}
                        color="primary"
                        component={AdapterLink}
                        to={`/user/${u.user._id}`}
                        variant="contained"
                      >
                        <Typography variant="button">View Profile</Typography>
                      </Button>
                      {/* <Button
                        className={classes.button}
                        color="primary"
                        variant="contained"
                        onClick={() => setInviteToClubMenuShown(true)}
                      >
                        <Typography variant="button">Invite to Club</Typography>
                      </Button> */}
                      {visitProfileLoadingId === u.user._id && (
                        <CircularProgress className={classes.progress} />
                      )}
                    </CardActions>
                    {u.user && u.user.photoUrl && (
                      <div className={classes.userAvatarContainer}>
                        <UserAvatar user={u.user} size={'small'} />
                      </div>
                    )}
                    {!u.user.photoUrl && (
                      <div className={classes.userAvatarContainer}>
                        <GenericGroupMemberAvatar
                          style={{ height: 112, width: 112 }}
                        />
                      </div>
                    )}
                    {inviteToClubMenuShown && (
                      <InviteToClubMenu
                        user={user}
                        clubsToInviteTo={u.invitableClubs}
                        inviteClubsMenuShown={inviteToClubMenuShown}
                      />
                    )}
                  </Card>
                </Grid>
              </MuiThemeProvider>
            );
          })}
        </Grid>
        <DiscordLoginModal
          onCloseLoginDialog={onCloseLoginDialog}
          open={loginModalShown}
        />
      </Container>
    </main>
  );
}
