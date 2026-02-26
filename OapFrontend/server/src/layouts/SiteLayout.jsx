import React from "react";
import { Outlet } from "react-router-dom";

import HomeNavbarDesktop from "@components/HomeNavBar/HomeNavbarDesktop";
import HomeNavbarMobile from "@components/HomeNavBar/HomeNavbarMobile";
import ProfileNavbarDesktop from "@components/ProfileNavbar/ProfileNavbarDesktop";
import ProfileNavbarMobile from "@components/ProfileNavbar/ProfileNavbarMobile";

import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";

import { useAuthUser } from "@context/AuthUserContext";

const SiteLayout = () => {
  const { isSignedIn, loading, authBusy } = useAuthUser();

  if (loading || authBusy) {
    return <ProcessingModal />;
  }

  return (
    <section className="container">
      {isSignedIn ? (
        <>
          <ProfileNavbarDesktop />
          <ProfileNavbarMobile />
        </>
      ) : (
        <>
          <HomeNavbarDesktop />
          <HomeNavbarMobile />
        </>
      )}

      <Outlet />
    </section>
  );
};

export default SiteLayout;
