import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    ...StyleSheet.absoluteFillObject,
  },
  finder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLeftEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  topRightEdge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  bottomLeftEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  bottomRightEdge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  maskOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  maskInner: {
    backgroundColor: 'transparent',
  },
  maskRow: {
    width: '100%',
  },
  maskCenter: {
    display: 'flex',
    flexDirection: 'row',
  },
  animatedLine: {
    position: 'absolute',
    elevation: 4,
    zIndex: 0,
    width: '85%',
  },
});

class BarcodeMask extends React.Component {

  constructor(props: any) {
    super(props);
    this.state = {
      top: new Animated.Value(10),
      maskCenterViewHeight: 0,
    };
  }

  _onMaskCenterViewLayoutUpdated = ({ nativeEvent }: any) => {
    this.setState({
      maskCenterViewHeight: nativeEvent.layout.height,
    });
  };

  _applyMaskFrameStyle = () => {
    let backgroundColor = '';
    if (
      (this.props as any).backgroundColor &&
      String((this.props as any).backgroundColor)
    ) {
      backgroundColor = (this.props as any).backgroundColor;
    }

    return { backgroundColor: (this.props as any).darken ?? true ? "rgba(0, 0, 0, 0.6)" : "transparent", flex: 1 };
  };

  _renderEdge = (edgePosition: any) => {
    const defaultStyle = {
      width: (this.props as any).edgeWidth,
      height: (this.props as any).edgeHeight,
      borderColor: (this.props as any).edgeColor,
    };
    const edgeBorderStyle = {
      topRight: {
        borderRightWidth: (this as any).props.edgeBorderWidth,
        borderTopWidth: (this as any).props.edgeBorderWidth,
      },
      topLeft: {
        borderLeftWidth: (this as any).props.edgeBorderWidth,
        borderTopWidth: (this as any).props.edgeBorderWidth,
      },
      bottomRight: {
        borderRightWidth: (this as any).props.edgeBorderWidth,
        borderBottomWidth: (this as any).props.edgeBorderWidth,
      },
      bottomLeft: {
        borderLeftWidth: (this as any).props.edgeBorderWidth,
        borderBottomWidth: (this as any).props.edgeBorderWidth,
      },
    };
    return <View style={[defaultStyle, (styles as any)[edgePosition + 'Edge'], (edgeBorderStyle as any)[edgePosition]]} />;
  };

  render() {
    return (
      <View style={[styles.container]}>
        <View
          style={[
            styles.finder,
            {
              width: (this.props as any).width,
              height: (this.props as any).height,
            },
          ]}
        >
          {this._renderEdge('topLeft')}
          {this._renderEdge('topRight')}
          {this._renderEdge('bottomLeft')}
          {this._renderEdge('bottomRight')}
        </View>

        <View style={styles.maskOuter}>
          <View style={[styles.maskRow, this._applyMaskFrameStyle()]} />
          <View
            style={[{ height: (this.props as any).height, width: "100%" }, styles.maskCenter]}
            onLayout={this._onMaskCenterViewLayoutUpdated}
          >
            <View style={[this._applyMaskFrameStyle()]} />
            <View
              style={[
                styles.maskInner,
                {
                  width: (this.props as any).width,
                  height: (this.props as any).height,
                },
              ]}
            />
            <View style={[this._applyMaskFrameStyle()]} />
          </View>
          <View style={[styles.maskRow, this._applyMaskFrameStyle()]} />
        </View>
      </View>
    );
  }

}

const propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  edgeWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  edgeHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  edgeColor: PropTypes.string,
  edgeBorderWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  showAnimatedLine: PropTypes.bool,
  animatedLineColor: PropTypes.string,
  animatedLineHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lineAnimationDuration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  backgroundColor: PropTypes.string,
};

const defaultProps = {
  width: 280,
  height: 230,
  edgeWidth: 20,
  edgeHeight: 20,
  edgeColor: '#FFF',
  edgeBorderWidth: 4,
  showAnimatedLine: true,
  animatedLineColor: '#FFF',
  animatedLineHeight: 2,
  lineAnimationDuration: 1500,
  backgroundColor: 'rgba(0, 0, 0, 0.6)'
};

(BarcodeMask as any).propTypes = propTypes;
(BarcodeMask as any).defaultProps = defaultProps;

export default BarcodeMask;
