/*
 *
 *
 *
 *      Bibliothèque codée par Daniel Zhu • Février 2019
 *
 *
 *
 */

"use strict";


if (document.cookie.replace(/(?:(?:^|.*;\s*)firstRefresh\s*\=\s*([^;]*).*$)|^.*$/, "$1") !== "true") {
    console.log( "firstRefresh cookie set" );
    window.location = "/hvz";
    document.cookie = "firstRefresh=true";
} else {
    console.log( "firstRefresh cookie already set" );
}


// ----------------------------------------------------------------------------
//  Paramètres
// ----------------------------------------------------------------------------

const FPS = 60;

const settings = {
    map: {
        // Indiqués par le constructeur de MapCanvas
        width: undefined,
        height: undefined,
    },

    camera: {
        // Position relative de la souris.
        mouseX: undefined,
        mouseY: undefined,

        // Écart entre l'origine absolue et l'origine relative
        gap: { x: 0, y: 0 },

        // Vitesse de déplacement de la caméra, en px/s
        moveSpeed: 20,

        // Largeur de la bande limite de la caméra, en pixels
        // (souris présente = mouvement de la caméra)
        moveBandSize: 20, // px
    },

    screen: {
        width: undefined,
        height: undefined,
    },

    animation: {
        fps: FPS,
        now: undefined,
        then: Date.now(),
        interval: 1000 / FPS,
        delta: undefined,
    },
};


// Fonction convertissant une position relative en position absolue
// Prend en paramètre un objet pos {x, y}
function R2A( xRel, yRel ) {
    return {  x: xRel + settings.camera.gap.x
            , y: yRel + settings.camera.gap.y };
}


// Fonction convertissant une position absolue en position relative
// Prend en paramètre un objet pos {x, y}
function A2R( xAbs, yAbs ) {
    return {  x: xAbs - settings.camera.gap.x
            , y: yAbs - settings.camera.gap.y };
}



// ----------------------------------------------------------------------------
//  Classe des canvas
// ----------------------------------------------------------------------------

// Classe générique pour tout type de canvas
class Canvas {

    // ------------------------------------------------------------------------
    // Constructeur
    //
    //  PARAMÈTRES :
    //      DOMElement (obj) : objet DOM représentant le canvas.
    // ------------------------------------------------------------------------
    
    constructor( DOMElement ) {
        this.element = DOMElement;
        this.context = this.element.getContext("2d");

        // Décalage entre l'origine absolue et l'origine relative
        settings.camera.gap.x = 0;
        settings.camera.gap.y = 0;

        // Redimensionnement automatique du canvas
        this.resize();
        addEventListener( "resize", () => this.resize(), false );
    }



    // ------------------------------------------------------------------------
    // Méthode-procédure redimensionnant le canvas
    // ------------------------------------------------------------------------

    resize() {
        settings.screen.width = document.documentElement.clientWidth;
        settings.screen.height = document.documentElement.clientHeight;

        this.element.width  = settings.screen.width;
        this.element.height = settings.screen.height;
    }



    // ------------------------------------------------------------------------
    // Méthode-procédure générant la matrice associée à la carte.
    //
    //  PARAMÈTRE :
    //      u (int) : unité de longueur en pixel. Tous les `u` pixels de la carte
    //                représenteront un cœfficient de la matrice.
    //
    // ------------------------------------------------------------------------
    generateMatrix( u ) {

        // On représentera tous les `u` pixels de la carte par un cœfficient de 
        // la matrice
        const n = Math.floor( settings.map.width / u )
            , p = Math.floor( settings.map.height / u );

        const matrix = new Array( n );

        // Remplissage de la matrice
        for ( let i = 0; i < n; i++ ) {
            matrix[i] = new Array( p );
        }

        // Retour
        return matrix;

    }
}



// Canvas dédié à la carte du jeu
class MapCanvas extends Canvas {

    // ------------------------------------------------------------------------
    // Constructeur
    //
    //  PARAMÈTRES :
    //      DOMElement (obj) : objet DOM représentant le canvas.
    //      image (obj)      : objet Image de la carte
    // ------------------------------------------------------------------------
    
    constructor( DOMElement, image = undefined ) {
        super( DOMElement );

        // Si une image est définie, l'attacher au canvas
        // Sinon, en attacher une créée par défaut
        if ( image instanceof Image ) {
            this.image = image;
        } else {
            this.image = new Image();
            this.image.src = "random_map.png";
        }

        // Indique les dimensions réelles de la carte
        settings.map.width = this.image.naturalWidth;
        settings.map.height = this.image.naturalHeight;

        // Dessin sur le canvas une fois l'image chargée
        this.image.addEventListener( "load", () => this.draw(), false );

        // Actualiser la position de la souris lorsqu'elle bouge
        addEventListener( "mousemove", function (e) {
            settings.camera.mouseX = e.clientX;
            settings.camera.mouseY = e.clientY;
        }.bind( this ), false );

        // Le redimensionnement et la navigation de la souris doivent
        // permettre de réadapter la vue (caméra) et donc de redessiner.
        requestAnimationFrame( () => this.camera() );
    }



    // ------------------------------------------------------------------------
    // Méthode-procédure dessinant la carte
    // ------------------------------------------------------------------------

    draw() {
        this.context.clearRect( 0, 0, settings.screen.width, settings.screen.height );
        this.context.drawImage(   this.image
                                , settings.camera.gap.x
                                , settings.camera.gap.y
                                , settings.screen.width
                                , settings.screen.height
                                , 0
                                , 0
                                , settings.screen.width
                                , settings.screen.height );
    }



    // ------------------------------------------------------------------------
    // Méthode-procédure permettant de naviguer sur la carte
    // ------------------------------------------------------------------------

    camera() {

        const screenX = settings.screen.width
            , screenY = settings.screen.height
            , mouseX  = settings.camera.mouseX
            , mouseY  = settings.camera.mouseY
            , margin  = settings.camera.moveBandSize
            , diff    = settings.camera.moveSpeed;

        // Booléens positionnels
        const topLeft  = ( mouseX < margin           && mouseY < margin )
            , topRight = ( mouseX > screenX - margin && mouseY < margin )
            , botLeft  = ( mouseX < margin           && mouseY > screenY - margin )
            , botRight = ( mouseX > screenX - margin && mouseY > screenY - margin );

        let moved = false;

        // Déplacer la carte vers le haut-gauche
        if ( topLeft ) {
            if ( settings.camera.gap.x > 0 ) { settings.camera.gap.x -= diff; moved = true; } // Gauche
            if ( settings.camera.gap.y > 0 ) { settings.camera.gap.y -= diff; moved = true; } // Haut
        }

        // Vers le haut-droit
        else if ( topRight ) {
            if ( settings.camera.gap.x + screenX <= settings.map.width - margin ) { // Droite
                settings.camera.gap.x += diff;
                moved = true;
            }

            if ( settings.camera.gap.y > 0 ) { // Haut
                settings.camera.gap.y -= diff;
                moved = true;
            }
        }

        // Vers le bas-gauche
        else if ( botLeft ) {
            if ( settings.camera.gap.x > 0 ) { settings.camera.gap.x -= diff; moved = true; } // Gauche

            if ( settings.camera.gap.y + screenY <= settings.map.height - margin ) { // Bas
                settings.camera.gap.y += diff;
                moved = true;
            }
        }

        // Vers le bas-droit
        else if ( botRight ) {
            if ( settings.camera.gap.x + screenX <= settings.map.width - margin ) { // Droite
                settings.camera.gap.x += diff;
                moved = true;
            }
            if ( settings.camera.gap.y + screenY <= settings.map.heigth - margin ) { // Bas
                settings.camera.gap.y += diff;
                moved = true;
            }
        }

        // Vers la gauche
        else if ( mouseX < margin ) {
            if ( settings.camera.gap.x > 0 ) { // Gauche
                settings.camera.gap.x -= diff;
                moved = true;
            }
        }

        // vers la droite
        else if ( mouseX > screenX - margin ) {
            if ( settings.camera.gap.x + screenX < settings.map.width - margin ) { // Droite
                settings.camera.gap.x += diff;
                moved = true;
            }
        }

        // Vers le haut
        else if ( mouseY < margin ) {
            if ( settings.camera.gap.y > 0 ) { // Haut
                settings.camera.gap.y -= diff;
                moved = true;
            }
        }

        // Vers le bas
        else if ( mouseY > screenY - margin ) {
            if ( settings.camera.gap.y + screenY <= settings.map.height - margin ) { // Bas
                settings.camera.gap.y += diff;
                moved = true;
            }
        }

        // Rien
        else {}

        // Redessiner l'image si un déplacement de caméra a été détecté
        if ( moved ) {
            this.draw();
        }

        requestAnimationFrame( () => this.camera() );
    }

}



// Canvas dédié aux unités du jeu
class UnitsCanvas extends Canvas {

    // ------------------------------------------------------------------------
    // Constructeur
    //
    //  PARAMÈTRES :
    //      DOMElement (obj) : objet DOM représentant le canvas.
    // ------------------------------------------------------------------------
    
    constructor( DOMElement ) {
        super( DOMElement );

        // Ensemble des unités attachées à la carte
        this.unitsList = new Set();

        // Matrice représentant spatialement les unités du jeu
        this.matrixUnit = 10;
        this.matrix = this.generateMatrix( this.matrixUnit );

        // Horloge interne pour l'animation
        requestAnimationFrame( () => this.moveUnits() );
    }



    // ------------------------------------------------------------------------
    // Déplace et anime les unités du jeu
    // ------------------------------------------------------------------------

    moveUnits() {
        
        settings.animation.now = Date.now();
        settings.animation.delta = settings.animation.now - settings.animation.then;

        // --------------------------------------------------------------------
        // Mise à jours de la position absolue de toutes les unités
        // (à ce stade là, on n'anime donc pas encore)
        // --------------------------------------------------------------------

        let moved = false;
        for ( let unit of this.unitsList ) {
            
            moved = false;

            // Mise à jours de la position absolue
            if ( unit.pos.x !== unit.to.x ) {
                if ( Math.abs(unit.pos.x - unit.to.x) < unit.speed ) { // Tout proche et vitesse trop grande : ok.
                    unit.pos.x = unit.to.x;
                } else { // Encore un peu loin : respecter la vitesse
                    unit.pos.x = ( unit.pos.x > unit.to.x )
                                    ? unit.pos.x - unit.speed
                                    : unit.pos.x + unit.speed;
                }

                moved = true;
            }

            if ( unit.pos.y !== unit.to.y ) {
                if ( Math.abs(unit.pos.y - unit.to.y) < unit.speed ) { // Tout proche et vitesse trop grande : ok.
                    unit.pos.y = unit.to.y;
                } else { // Encore un peu loin : respecter la vitesse
                    unit.pos.y = ( unit.pos.y > unit.to.y )
                                    ? unit.pos.y - unit.speed
                                    : unit.pos.y + unit.speed;
                }

                moved = true;

            }

            // Mise à jours de la matrice des unités et de leurs coordonnées matricielles
            if ( moved ) {

                if ( this.matrix[ unit.matrixPos.x ][ unit.matrixPos.y ].delete( unit ) ) {
                    unit.matrixPos.x = Math.floor( unit.pos.x / this.matrixUnit );
                    unit.matrixPos.y = Math.floor( unit.pos.y / this.matrixUnit );

                    if ( this.matrix[ unit.matrixPos.x ][ unit.matrixPos.y ] instanceof Set ) {
                        this.matrix[ unit.matrixPos.x ][ unit.matrixPos.y ].add( unit );
                    } else {
                        this.matrix[ unit.matrixPos.x ][ unit.matrixPos.y ] = new Set([ unit ]);
                    }
                }

            }
        }
        

        // --------------------------------------------------------------------
        // Animation (en respectant le nombre de frames par secondes)
        // --------------------------------------------------------------------

        if ( settings.animation.delta > settings.animation.interval ) {

            let rel = undefined
              , borderSize = undefined;

            // Calcul de l'instant du prochaine frame
            settings.animation.then = settings.animation.now - (settings.animation.delta % settings.animation.interval);

            // Effacer les unités de la carte
            this.context.clearRect( 0, 0, settings.screen.width, settings.screen.height );

            // Dessiner les unités VISIBLES
            for ( let unit of this.unitsList ) {

                // L'unité est visible
                if (   settings.camera.gap.x <= unit.pos.x
                    && unit.pos.x <= settings.camera.gap.x + settings.screen.width
                    && settings.camera.gap.y <= unit.pos.y
                    && unit.pos.y <= settings.camera.gap.y + settings.screen.height ) {

                    // Calcul des coordonnées relatives
                    rel = A2R( unit.pos.x, unit.pos.y );

                    // Barre de vie
                    const lifeRate = 2 * unit.lifebar / unit.lifemax;

                    // Contour
                    this.context.beginPath();

                    if ( unit.isSelected() ) {
                        this.context.lineWidth = 2.5;
                    } else {
                        this.context.lineWidth = 1;
                    }

                    this.context.strokeStyle = unit.colour;
                    this.context.arc(  rel.x
                                     , rel.y
                                     , unit.size + this.context.lineWidth + 1
                                     , 0
                                     , lifeRate * Math.PI );
                    this.context.stroke();

                    // Remplissage
                    this.context.beginPath();
                    this.context.fillStyle = unit.colour;
                    this.context.arc(  rel.x
                                     , rel.y
                                     , unit.size
                                     , 0
                                     , 2 * Math.PI );
                    this.context.fill();
                }
            }

        }

        requestAnimationFrame( () => this.moveUnits() );
    }



    // ------------------------------------------------------------------------
    // Ajoute une unité dans le canvas
    //
    //  PARAMÈTRES :
    //      unit (obj) : objet représentant l'unité à dessiner sur la carte
    // ------------------------------------------------------------------------
    
    attach( unit ) {
        if ( unit instanceof Unit ) {
            // Ajout de l'unité dans la liste
            this.unitsList.add( unit );
            unit.canvas = this;

            // Ajout l'unité dans la matrice des unités
            const i = Math.floor( unit.pos.x / this.matrixUnit )
                , j = Math.floor( unit.pos.y / this.matrixUnit );

            // Stocker la position matricielle dans l'unité (xd)
            unit.matrixPos.x = i;
            unit.matrixPos.y = j;

            if ( this.matrix[i][j] instanceof Set ) { // La case contient déjà une ou des unité(s)
                this.matrix[i][j].add( unit );
            } else { // La case est vierge : y créer un ensemble contenant l'unité
                this.matrix[i][j] = new Set([ unit ]);
            }

        } else if ( unit instanceof Set ) {
            unit.forEach( (u) => this.attach(u) );
        } else {
            console.log( `L'objet ${unit} n'est ni une unité ni un ensemble d'unités !` );
        }
    }

}



// Canvas dédié aux signaux et aux ordres
class SignalsCanvas extends Canvas {

    // ------------------------------------------------------------------------
    // Constructeur
    //
    //  PARAMÈTRES :
    //      DOMElement (obj) : objet DOM représentant le canvas ;
    // ------------------------------------------------------------------------
    
    constructor( DOMElement ) {
        super( DOMElement );

        // Joueur principal (celui qui joue)
        this.player = undefined;

        // Sélection en cours
        this.selecting = {
            id: null,
            begin: null,
            end: null,
        };


        // --------------------------------------------------------------------
        // SÉLECTION : Détection d'une sélection
        // ORDRE     : Destination donnée aux unités sélectionnées
        // --------------------------------------------------------------------

        addEventListener( "mousedown", function ( e ) {

            // Clic gauche seulement
            if ( e.button === 0 ) {

                // Initialiser la sélection
                this.selecting.id = requestAnimationFrame( () => this.selectCursor() );
                this.selecting.begin = R2A( settings.camera.mouseX, settings.camera.mouseY );

            }

        }.bind( this ), false );


        // --------------------------------------------------------------------
        // SÉLECTION : Fin d'une sélection
        // ORDRE     : Destination donnée aux unités sélectionnées
        // --------------------------------------------------------------------

        addEventListener( "mouseup", function ( e ) {
            
            // Fin de l'animation de la sélection
            this.selectEndAnimation();
            
            // Clic gauche seulement
            if ( e.button === 0 ) {

                if ( this.wasAnOrder() ) {
                    
                    // Il s'agit d'un ordre \\

                    if ( this.player instanceof Player ) {
                        let pos = R2A( settings.camera.mouseX, settings.camera.mouseY ) // Position absolue de la cible
                          , uNb = 0;                                                    // Nombre d'unités

                        // Donner l'ordre à tous les sélectionnés
                        for ( let unit of this.player.unitsList ) {
                            if ( unit.isSelected() ) {

                                // Ordre de déplacement
                                unit.goesTo( pos.x, pos.y );

                                // Si l'unité était en train d'attaquer, elle s'enfuit
                                if ( unit.target !== null ) {
                                    unit.target = null;
                                }

                                // Pour éviter que plusieurs unités s'empilent l'une sur l'autre,
                                // on s'arrange pour changer légèrement la position cible absolue en
                                // fonction du nombre d'unités sélectionnées
                                pos.x += 3 * unit.size ;
                                // pos.y += 0 ;

                                // Incrémentation du nombre d'unités
                                uNb += 1;
                            }
                        }
                    }

                } else {

                    // Il s'agit d'une sélection \\

                    // Une nouvelle sélection implique que l'on ne prenne plus
                    // en compte les anciennes sélections
                    this.selectCancel();

                    // Traiter la nouvelle sélection
                    this.selecting.end = R2A( settings.camera.mouseX, settings.camera.mouseY ) ;
                    this.selectEnd();
                    
                }

                // Fin de la sélection
                this.selecting.id = null;
                this.selecting.begin = null;
                this.selecting.end = null;

            }

        }.bind( this ), false );


        // --------------------------------------------------------------------
        // SÉLECTION : Annulation d'une sélection
        // --------------------------------------------------------------------

        addEventListener( "contextmenu", function ( e ) {
            
            // Désactiver les menus du clic droit (aucune utilité ici et plus
            // gênant qu'autre chose pour le jeu...)
            e.preventDefault();

            // Annulation de la sélection
            this.selectCancel();

        }.bind( this ), false );

    }



    // ------------------------------------------------------------------------
    // Procédures-méthodes affichant la sélection en cours sur l'écran, traitant
    // la sélection en cours, annulant une sélection
    // ------------------------------------------------------------------------

    selectCursor() {

        const pos   = { x: settings.camera.mouseX, y: settings.camera.mouseY } // Position de la souris absolue
            , absOr = A2R( this.selecting.begin.x, this.selecting.begin.y );

        // Origine du début de la sélection - À adapter selon la caméra
        if ( 0 > absOr.x ) {
            absOr.x = 0;
        } else if ( absOr.x > settings.map.width ) {
            absOr.x = settings.map.width;
        } else {}

        if ( 0 > absOr.y ) {
            absOr.y = 0;
        } else if ( absOr.y > settings.map.height ) {
            absOr.y = settings.map.height;
        } else {}

        // Animation
        this.context.clearRect( 0, 0, settings.screen.width, settings.screen.height );
        this.context.beginPath();
        this.context.strokeStyle = "#FFFFFF";
        this.context.rect(  absOr.x
                          , absOr.y
                          , pos.x - absOr.x
                          , pos.y - absOr.y );
        this.context.stroke();

        // Maintien de l'animation
        this.selecting.id = requestAnimationFrame( () => this.selectCursor() );

    }

    selectEndAnimation() {

        // Fin de l'animation
        this.context.clearRect( 0, 0, settings.screen.width, settings.screen.height );
        cancelAnimationFrame( this.selecting.id );

    }

    selectEnd() {

        // Si on a sélectionné du bas-droit vers le haut-gauche, inverser les valeurs
        if ( this.selecting.begin.x > this.selecting.end.x ) {
            const tmp = this.selecting.begin.x;
            this.selecting.begin.x = this.selecting.end.x;
            this.selecting.end.x   = tmp;
        }

        if ( this.selecting.begin.y > this.selecting.end.y ) {
            const tmp = this.selecting.begin.y;
            this.selecting.begin.y = this.selecting.end.y;
            this.selecting.end.y   = tmp;
        }

        // Sélection des unités du joueur principal dans la sélection
        if ( this.player instanceof Player ) {
            for ( let unit of this.player.unitsList ) {
                if (   this.selecting.begin.x <= unit.pos.x
                    && this.selecting.begin.y <= unit.pos.y
                    && unit.pos.x <= this.selecting.end.x
                    && unit.pos.y <= this.selecting.end.y ) {

                    unit.select();

                }
            }
        }

    }

    selectCancel() {

        // Désélection des unités anciennement sélectionnées
        if ( this.player instanceof Player ) {
            for ( let unit of this.player.unitsList ) {
                unit.deselect();
            }
        }

    }



    // ------------------------------------------------------------------------
    // Procédure-méthode désignant le joueur principal (celui qui joue)
    //
    // PARAMÈTRE :
    //      player (obj) : objet représentant le joueur principal
    // ------------------------------------------------------------------------

    mainPlayer( player ) {
        if ( player instanceof Player ) {
            this.player = player;
        } else {
            console.log( "Seule une instance de `Player` peut-être assignée à `SignalsCanvas.mainPlayer()` !" );
        }
    }



    // ------------------------------------------------------------------------
    // Méthode qui détecte si un clic correspond à une sélection ou à un ordre.
    //
    // RETOUR :
    //      (bool) : true s'il s'agissait d'un ordre, false sinon
    // ------------------------------------------------------------------------

    wasAnOrder() {
        const pos = R2A( settings.camera.mouseX, settings.camera.mouseY ) 
            , gap = {
                        x: Math.abs( this.selecting.begin.x - pos.x ),
                        y: Math.abs( this.selecting.begin.y - pos.y ),
                    };

        return ( gap.x < 10 && gap.y < 10 );
    }
}



// ----------------------------------------------------------------------------
//  Classe des joueurs
// ----------------------------------------------------------------------------

class Player {

    // ------------------------------------------------------------------------
    // Constructeur
    //  
    //  PARAMÈTRES :
    //      id (int) : identifiant du joueur. Désigne l'IA s'il vaut 0.
    // ------------------------------------------------------------------------

    constructor( id = 0 ) {

        // Identifiant du joueur
        this.id = ( Number.isInteger( id ) && id >= 0 )
                    ? id
                    : 0;

        // Une couleur aléatoire est attribuée à chaque joueur
        this.colour = "#";

        const letters = "0123456789ABCDEF";
        for ( let i = 0; i < 6; i++ ) {
            this.colour += letters[Math.floor(Math.random() * letters.length)];
        }

        // Liste des unités
        this.unitsList = new Set();

    }



    // ------------------------------------------------------------------------
    // Attribue une unité au joueur
    //  
    //  PARAMÈTRES :
    //      unit (obj) : L'unité à affecter au joueur
    // ------------------------------------------------------------------------

    owns( unit ) {
        if ( unit instanceof Unit ) {
            this.unitsList.add( unit );
        } else {
            console.log( "On ne peut affecter que des unités à un joueur !" );
        }
    }

}



// ----------------------------------------------------------------------------
//  Classe des unités
// ----------------------------------------------------------------------------

// Classe générique
class Unit {

    // ------------------------------------------------------------------------
    // Constructeur
    //  
    //  PARAMÈTRES :
    //      owner (obj) : objet Player du propriétaire de l'unité
    //      xInit (int) : coordonnée initiale absolue de l'unité (abscisse)
    //      yInit (int) : coordonnée initiale absolue de l'unité (ordonnée)
    // ------------------------------------------------------------------------

    constructor( owner, xInit, yInit ) {

        // Affecter l'unité à son propriétaire (s'il existe)
        if ( owner instanceof Player ) {
            this.owner = owner;
            owner.owns( this );
        } else {
            this.owner = null;
        }

        // Canvas des unités
        this.canvas = undefined;

        // Position absolue actuelle et position absolue ciblée
        this.pos = { x: xInit, y: yInit };
        this.to = { x: xInit, y: yInit };
        this.matrixPos = { x: undefined, y: undefined, };

        // Est sélectionné
        this.selected = false;

        // Cible
        this.target = null;
        this.targetedBy = new Set();

        // Recherche autour de lui constamment s'il y a une cible
        setInterval( function () {
            this.seekTarget();
        }.bind( this ), 500 );

        // Attaquer un ennemi à porté
        setInterval( function () {
            this.attackTarget();
        }.bind( this ), 1000 );
    }



    // ------------------------------------------------------------------------
    // Donne une destination à l'unité
    //  
    //  PARAMÈTRES :
    //      x (int) : coordonnée cible absolue de l'unité (abscisse)
    //      y (int) : coordonnée cible absolue de l'unité (ordonnée)
    // ------------------------------------------------------------------------

    goesTo( x, y ) {
        if (   0 <= x && x <= settings.map.width
            && 0 <= y && y <= settings.map.height ) {

            this.to.x = x;
            this.to.y = y;

        } else {
            console.log( `\`Unit.goesTo()\` : (${x};${y}) ∉ {(x;y) ∈ R² ; 0 ≤ x ≤ ${settings.map.width} ∧ 0 ≤ y ≤ ${settings.map.height}} !` );
        }
    }



    // ------------------------------------------------------------------------
    // Procédures-méthodes choisissant (resp. déchoissant) l'unité actuelle et
    // indiquant si l'unité est choisie
    // ------------------------------------------------------------------------

    select() {
        this.selected = true;
    }

    deselect() {
        this.selected = false;
    }

    isSelected() {
        return this.selected;
    }



    // ------------------------------------------------------------------------
    // Procédure-méthode permettant à l'unité de chercher une cible à portée
    // ------------------------------------------------------------------------

    seekTarget() {

        // Chercher une cible uniquement si on n'a pas déjà une cible
        if ( this.target === null ) {

            const from = { x: this.matrixPos.x - this.range,
                           y: this.matrixPos.y - this.range, }
                , to   = { x: this.matrixPos.x + this.range + 1,
                           y: this.matrixPos.y + this.range + 1 };

            // Recherche d'ennemis dans un rayon de `this.range` autour de l'unité
            let tmp;
            for ( let i = from.x; i < to.x; i++ ) {
                for ( let j = from.y; j < to.y; j++ ) {

                    tmp = this.canvas.matrix[i][j];

                    // Ennemi(s) possiblement présent(s)
                    if ( tmp instanceof Set ) {

                        // Qui sont toutes les unités présentes dans cette case ?
                        for ( let u of tmp ) {
                            for ( let ennemy of this.ennemies ) { // Cette unité est-elle un ennemi ?
                                if ( u instanceof ennemy ) { // Ennemi en vu !
                                    if ( u.lifebar > 0 ) {
                                        this.target = u;
                                        u.targetedBy.add( this );
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }

        }
    }



    // ------------------------------------------------------------------------
    // Procédure-méthode permettant à l'unité d'attaquer en continue la cible
    // à porté
    // ------------------------------------------------------------------------

    attackTarget() {
        if ( this.target !== null ) { // Encore faut-il avoir une cible

            // Distance réelle (pixels)
            const distance = Math.sqrt(  Math.pow( this.pos.x - this.target.pos.x, 2 )
                                       + Math.pow( this.pos.y - this.target.pos.y, 2 ) );

            // Distance matricielle
            const matrixDistance = Math.floor( distance / this.canvas.matrixUnit ) - 1;

            // À porté de tir 
            if ( matrixDistance <= this.range ) {

                // Pas de raison que la cible se laisse faire si elle est libre...
                if ( this.target.target === null ) {
                    this.target.target = this;
                }

                // La cible se prend des dégâts
                this.target.takeDamages( this.damage );

            } else { // Se rapprocher sinon
                const pos = {
                    x: this.target.pos.x
                  , y: this.target.pos.y
                };

                if ( this.pos.x < pos.x ) {
                    pos.x -= this.range * this.canvas.matrixUnit;
                } else {
                    pos.x += this.range * this.canvas.matrixUnit;
                }

                if ( this.pos.y < pos.y ) {
                    pos.y -= this.range * this.canvas.matrixUnit;
                } else {
                    pos.y += this.range * this.canvas.matrixUnit;
                }

                this.goesTo( pos.x, pos.y );
            }

        }
    }



    // ------------------------------------------------------------------------
    // Procédure-méthode permettant à l'unité de subir des dégâts.
    //
    //  PARAMÈTRE :
    //      dmg (int) : dégâts à subir
    // ------------------------------------------------------------------------

    takeDamages( dmg ) {
        if ( Number.isFinite( dmg ) ) { // `dmg` doit être un réel (fini)
            this.lifebar -= dmg;

            if ( this.lifebar <= 0 ) { // L'unité est morte ?

                this.target = null;
                this.damage = 0;
                this.lifebar = 0;

                // Indiquer à tous ceux qui le ciblent qu'on est déjà mort
                for ( let attacker of this.targetedBy ) {
                    attacker.target = null;
                    this.targetedBy.delete( attacker );
                }

                // Retirer de la liste des unités du canvas et du joueur
                this.canvas.unitsList.delete( this );
                this.owner.unitsList.delete( this );

            }
        } else {
            console.log( `\`Unit.takeDamages( dmg )\` : \`dmg\` ∉ R` );
        }
    }
}


// Classe des soldats
class Soldier extends Unit {

    // ------------------------------------------------------------------------
    // Constructeur
    //  
    //  Voir le constructeur de la classe Unit
    // ------------------------------------------------------------------------

    constructor( owner, x, y ) {
        super( owner, x, y );
        this.colour = owner.colour;

        // Statistiques
        this.size  = 7; // Taille de l'unité (rayon en px)
        this.lifemax = 30;
        this.lifebar = 30;
        this.speed = 1.25;
        this.range = 5;
        this.damage = 3;

        // Ennemi
        this.ennemies = new Set([ Zombie ]);
        
    }
}


// Classe des zombies
class Zombie extends Unit {

    // ------------------------------------------------------------------------
    // Constructeur
    //  
    //  Voir le constructeur de la classe Unit
    // ------------------------------------------------------------------------

    constructor( owner, x, y ) {
        super( owner, x, y );
        this.colour = "#000000";

        // Statistiques
        this.size  = 5; // Taille de l'unité (rayon en px)
        this.lifemax = 20;
        this.lifebar = 20;
        this.speed = 0.3; // Vitesse (px/s)
        this.range = 1;
        this.damage = 1;

        // Ennemi
        this.ennemies = new Set([ Soldier ]);
        
    }
}



// ----------------------------------------------------------------------------
//  Application
// ----------------------------------------------------------------------------

const MainMap   = new MapCanvas( document.getElementById("map") )
    , UnitsMap  = new UnitsCanvas( document.getElementById("units") )
    , Signals   = new SignalsCanvas( document.getElementById("signals") )
    , AI        = new Player()
    , Self      = new Player( 1 )
    , Z         = new Set();

// Désignation du joueur actuel
Signals.mainPlayer( Self );

// Fonction générant un entier pseudo-aléatoire
const rd_int = ( maxVal = MainMap.image.naturalWidth ) => Math.floor(Math.random() * maxVal) ;

// Soldats
UnitsMap.attach( new Soldier( Self, 100 + 20, 100 ) );
UnitsMap.attach( new Soldier( Self, 100, 100 + 20 ) );
UnitsMap.attach( new Soldier( Self, 100, 100 ) );
UnitsMap.attach( new Soldier( Self, 100 - 20, 100 ) );
UnitsMap.attach( new Soldier( Self, 100, 100 - 20 ) );

for (let i = 0; i < 100; i++) {
    Z.add( new Zombie(AI, rd_int(), rd_int()) );
}

setInterval( function () {
    for (let u of Z) {
        if ( u.target === null ) {
            u.goesTo( rd_int(), rd_int() );
        }
    }
}, 3000 );

UnitsMap.attach( Z );
