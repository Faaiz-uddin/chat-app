const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); 

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/api/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
              
                let existingUser = await User.findOne({ googleId: profile.id });

                if (existingUser) {
                    return done(null, existingUser);
                }

            
                const newUser = new User({
                    googleId: profile.id,
                    username: profile.displayName,
                    email: profile.emails[0].value,
                    profileImage: profile.photos[0].value
                });

                await newUser.save();
                done(null, newUser);
            } catch (err) {
                done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
   
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    console.log("Deserializing User ID:", id); 
    try {
        const user = await User.findById(id);
        console.log("Deserialized User:", user); 
        done(null, user);
    } catch (err) {
        console.error("Error in deserializing user:", err); 
        done(err, null);
    }
});